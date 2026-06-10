import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { getCurrentActivity, getFirstActivity, getNextActivity, getTotalActivities, getLessonContext, getActivityById } from '@/lib/lesson-parser'
import { buildSystemPrompt, getMaxTokensForActivity, isStudentUnsureStrong } from '@/lib/prompt-builder'
import { isPassing } from '@/lib/rubric'
import { calculateGrade, calculateCompletionGrade } from '@/lib/grading'
import { checkRateLimit } from '@/lib/rate-limit'
import { detectHallucination } from '@/lib/hallucination-detector'
import { logger, logChatMessage, logError } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { verifyActivityCompletion, verifyStepCompletion } from '@/lib/activity-verification'
import { moderateContent, getInterventionMessage } from '@/lib/services/moderation'
import { classifyIntent } from '@/lib/services/intent-classification'
import { compressMessagesForAPI } from '@/lib/message-summarizer'
import { generateLessonReport } from '@/lib/lesson-report'
import { processPlannerAttachments } from '@/lib/planner/attachments'
import type { LessonContent } from '@/types/lesson'
import type { Message, Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

// Marcador del "brief" acordado en la sesión-bisagra de cursos basados en
// proyecto (CODE personalizado). Sophia lo emite cuando el estudiante confirma
// la propuesta estructurada; el contenido entre los marcadores es JSON.
const PROJECT_BRIEF_REGEX =
  /---PROJECT_BRIEF---\s*([\s\S]*?)\s*---END_PROJECT_BRIEF---/

function extractProjectBrief(text: string): { brief: unknown | null; cleaned: string } {
  const match = text.match(PROJECT_BRIEF_REGEX)
  if (!match) return { brief: null, cleaned: text }
  try {
    const brief = JSON.parse(match[1].trim())
    const cleaned = text.replace(PROJECT_BRIEF_REGEX, '').trim()
    return { brief, cleaned }
  } catch {
    // JSON inválido — preservamos el mensaje original y no guardamos brief
    return { brief: null, cleaned: text }
  }
}

export async function POST(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting: 10 mensajes por minuto
  const rateLimit = checkRateLimit(session.userId, 10, 60)
  if (!rateLimit.allowed) {
    const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    logger.warn('rate_limit.exceeded', {
      userId: session.userId,
      resetIn,
    })
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Has alcanzado el límite de mensajes. Intenta de nuevo en ${resetIn} segundos.`,
        resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  }

  const {
    sessionId,
    message,
    attachments,
  } = (await request.json()) as {
    sessionId: string
    message: string
    attachments?: Array<{ name: string; mimeType: string; dataBase64: string }>
  }

  // 1. Validate session and fetch full contentJson with course data
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.userId,
      endedAt: null,
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          objective: true,
          keyPoints: true,
          course: {
            select: {
              instructor: true,
              methodology: true,
            },
          },
        },
      },
      activities: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
      },
    },
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }

  // Cargar últimos 20 mensajes SIN filtrar por activityId
  // (El filtro por activityId causaba que el mensaje de transición se perdiera,
  // dejando a Claude sin contexto del escenario cuando el estudiante decía "no sé")
  const messages = await prisma.message.findMany({
    where: {
      sessionId: lessonSession.id,
    },
    orderBy: { timestamp: 'desc' },
    take: 20,
  })

  // Adjuntar mensajes a lessonSession para mantener compatibilidad (cast para TypeScript)
  const sessionWithMessages = lessonSession as typeof lessonSession & { messages: Message[] }
  sessionWithMessages.messages = messages

  // 2. Get lesson content (from hardcoded file or DB)
  const contentJson = await getLessonContent(lessonSession.lesson.id) as LessonContent

  if (!contentJson) {
    logger.error('chat.stream.lesson_content_not_found', {
      sessionId,
      lessonId: lessonSession.lesson.id,
    })
    return new Response('Lesson content not found', { status: 404 })
  }

  // Obtener datos del curso para el prompt
  const courseInstructor = lessonSession.lesson.course?.instructor || 'Eres un instructor experto y amable.'
  const lessonTitle = lessonSession.lesson.title
  const lessonObjective = lessonSession.lesson.objective || ''
  const lessonKeyPoints = lessonSession.lesson.keyPoints || []

  // Obtener actividad actual basada en progreso
  let currentActivityContext

  if (lessonSession.activityId) {
    currentActivityContext = getCurrentActivity(
      contentJson,
      lessonSession.activityId,
      lessonTitle,
      lessonObjective,
      lessonKeyPoints,
      courseInstructor
    )
  } else {
    // Fallback: Primera vez, obtener primera actividad
    const firstActivity = getFirstActivity(contentJson)
    if (firstActivity) {
      currentActivityContext = getCurrentActivity(
        contentJson,
        firstActivity.activityId,
        lessonTitle,
        lessonObjective,
        lessonKeyPoints,
        courseInstructor
      )
    }
  }

  if (!currentActivityContext) {
    return new Response('No activities found in lesson', { status: 500 })
  }

  // Historial completo para verificación (necesita contexto completo)
  const conversationHistory = sessionWithMessages.messages.reverse().map((m: Message) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Historial comprimido para enviar a Claude (optimizado)
  // - Mensajes del estudiante: completos
  // - Mensajes del instructor: resumidos con ESCENARIO + PREGUNTA preservados
  const compressedHistory = compressMessagesForAPI(conversationHistory, 10)

  // DEBUG: Log mensajes comprimidos para verificar preservación de escenario
  logger.info('chat.stream.compressed_history', {
    sessionId,
    originalCount: conversationHistory.length,
    compressedCount: compressedHistory.length,
    compressedMessages: compressedHistory.map(m => ({
      role: m.role,
      contentPreview: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '')
    }))
  })

  // 3. 🔥 NUEVO: Verificación ANTICIPADA antes de generar respuesta
  const currentActivity = currentActivityContext.activity

  // Obtener intentos y tangent count actuales
  const activityProgress = await prisma.activityProgress.findUnique({
    where: {
      lessonSessionId_activityId: {
        lessonSessionId: lessonSession.id,
        activityId: currentActivity.id,
      },
    },
    select: { status: true, attempts: true, tangentCount: true, evidenceData: true },
  })

  const attempts = activityProgress?.attempts || 0
  const tangentCount = activityProgress?.tangentCount || 0
  const existingEvidence = (activityProgress?.evidenceData as {
    attempts?: Array<unknown>
    scaffoldingTurns?: number
    wasExplained?: boolean
  } | null) || { attempts: [] }
  const scaffoldingTurns = existingEvidence.scaffoldingTurns || 0
  const wasExplained = existingEvidence.wasExplained === true

  // Detectar si esta vuelta vamos a inyectar una MINI-EXPLICACIÓN (no-sé fuerte
  // + primer intento + no fue explicado antes). Si sí, marcamos el flag para
  // que el verificador en la próxima vuelta sepa "ya hubo enseñanza".
  const willExplainThisTurn =
    !wasExplained &&
    (activityProgress?.attempts || 0) <= 1 &&
    isStudentUnsureStrong(message)

  // Cap de sub-preguntas (desglose) por tipo de actividad. Reflection cierra
  // pronto porque es una sola pregunta abierta — no se desglosa repetidamente.
  // CODE methodology no escala (usa verifyStepCompletion binario).
  const SCAFFOLDING_CAP_BY_TYPE: Record<string, number> = {
    explanation: 3,
    practice: 3,
    reflection: 1,
    closing: 3,
  }
  const scaffoldingCap = SCAFFOLDING_CAP_BY_TYPE[currentActivity.type as string] ?? 3

  // ═══════════════════════════════════════════════════════════════
  // 3. MODERACIÓN + CLASIFICACIÓN + VERIFICACIÓN EN PARALELO
  // ═══════════════════════════════════════════════════════════════
  // Backwards compatibility: support both old and new structure
  const currentActivityInstruction = currentActivity.teaching?.agent_instruction ||
    (currentActivity as { agent_instruction?: string }).agent_instruction || ''

  // 🔥 FIX: Buscar el último mensaje del INSTRUCTOR (no cualquier mensaje)
  const lastInstructorMessage = sessionWithMessages.messages.find(m => m.role === 'assistant')

  // Detectar si la actividad ya fue completada previamente
  const activityAlreadyCompleted = activityProgress?.status === 'COMPLETED'

  // Detectar si el mensaje es una confirmación simple ("sí", "ok", "continuar")
  const CONTINUATION_REGEX = /^(si|sí|ok|vale|entendido|claro|continuar|siguiente|adelante|de acuerdo|perfecto|listo|vamos|dale|ya|bueno)(\s+(por\s+favor|porfavor|gracias))?[.!]?$/i
  const isContinuationMessage = CONTINUATION_REGEX.test(message.trim())

  // Detector de hallucinations de voz (Whisper transcribiendo ruido como palabras).
  // Si se detecta, saltamos verificación AI (caro y engañoso) y devolvemos
  // un off_topic suave que no cuenta como intento real.
  const hallucinationCheck = detectHallucination(message)
  if (hallucinationCheck.isHallucination) {
    logger.warn('chat.stream.hallucination_detected', {
      sessionId,
      userId: session.userId,
      reason: hallucinationCheck.reason,
      messagePreview: message.slice(0, 80),
    })
  }

  const [moderation, intent, verification] = await Promise.all([
    moderateContent(message, { lessonTitle }),
    classifyIntent(message, currentActivity, {
      currentLesson: lessonTitle,
      currentActivity: currentActivityInstruction,
      lastInstructorQuestion: lastInstructorMessage?.content || undefined
    }),
    // Hallucination de voz: skip AI verifier (caro), tratar como off_topic
    // suave para que Sophia pida repetir sin contar como intento real.
    hallucinationCheck.isHallucination
      ? Promise.resolve({
          completed: false,
          criteriaMatched: [] as string[],
          criteriaMissing: [] as string[],
          completeness_percentage: 0,
          understanding_level: 'memorized' as const,
          response_type: 'off_topic' as const,
          feedback: 'No te entendí bien, ¿podés repetir?',
          confidence: 'high' as const,
          ready_to_advance: false,
          needs_scaffolding: false,
          next_subquestion: undefined,
        })
    // Solo skip verificación si la actividad YA está completada en DB.
    // criteriaMatched queda [] — antes era ["Actividad ya completada"] (string
    // genérico) que contaminaba evidenceData y rompía el reporte (no podía
    // distinguir qué must_include real cumplió).
    : activityAlreadyCompleted
      ? Promise.resolve({
          completed: true,
          criteriaMatched: [] as string[],
          criteriaMissing: [] as string[],
          completeness_percentage: 100,
          understanding_level: 'understood' as const,
          response_type: 'correct' as const,
          feedback: '',
          confidence: 'high' as const,
          ready_to_advance: true,
          needs_scaffolding: false,
          next_subquestion: undefined,
        })
      // Continuaciones ("sí", "listo"): verificar acumulativamente.
      // CODE: verificación binaria (¿completó el paso?). REFLECTIVE: socrática.
      : (lessonSession.lesson.course?.methodology === 'CODE'
          ? verifyStepCompletion(message, currentActivity, conversationHistory)
          : verifyActivityCompletion(message, currentActivity, conversationHistory, wasExplained))
  ])

  // Logging de clasificación
  logger.info('chat.stream.classification', {
    sessionId,
    intent: intent.intent,
    is_on_topic: intent.is_on_topic,
    relevance_score: intent.relevance_score,
    moderation_safe: moderation.is_safe,
  })

  // ═══════════════════════════════════════════════════════════════
  // Escalada por desglose (scaffolding)
  // ═══════════════════════════════════════════════════════════════
  // El AI evaluador puede indicar needs_scaffolding=true cuando la respuesta
  // es parcial/cero pero en tema. Sophia entonces desglosa con una sub-pregunta
  // específica. Si ya alcanzamos el cap por tipo, forzamos avanzar con el nivel
  // actual (no se castiga al estudiante: el nivel ya refleja lo que llegó a dar).
  let willScaffold = false
  if (
    verification.needs_scaffolding === true &&
    verification.next_subquestion &&
    !activityAlreadyCompleted
  ) {
    if (scaffoldingTurns < scaffoldingCap) {
      willScaffold = true
    } else {
      // Cap alcanzado: avanzar con el nivel ya escalado
      verification.needs_scaffolding = false
      verification.ready_to_advance = true
      logger.info('chat.stream.scaffolding_cap_reached', {
        sessionId,
        activityId: currentActivity.id,
        scaffoldingTurns,
        cap: scaffoldingCap,
        finalLevel: verification.understanding_level,
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. VERIFICAR MODERACIÓN - Intervenir sin guardar en BD
  // ═══════════════════════════════════════════════════════════════
  if (!moderation.is_safe) {
    logger.warn('chat.stream.moderation_blocked', {
      sessionId,
      userId: session.userId,
      severity: moderation.severity,
      violations: moderation.violations,
    })

    const interventionMessage = getInterventionMessage(moderation, courseInstructor)

    // Retornar mensaje de intervención sin streaming completo
    const encoder = new TextEncoder()
    const interventionStream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({ type: 'content', text: interventionMessage })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      }
    })

    return new Response(interventionStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  logger.info('chat.stream.pre_verification', {
    sessionId,
    activityId: currentActivity.id,
    completed: verification.completed,
    ready_to_advance: verification.ready_to_advance,
    completeness_percentage: verification.completeness_percentage,
    confidence: verification.confidence,
    attempts: attempts + 1,
  })

  // Obtener lista de actividades completadas para contexto del prompt
  const completedActivityIds = lessonSession.activities
    .filter(a => a.status === 'COMPLETED')
    .map(a => a.activityId)

  // ═══════════════════════════════════════════════════════════════
  // 5. BUILD SYSTEM PROMPT CON PROMPT CACHING
  // ═══════════════════════════════════════════════════════════════
  // Obtener contexto de lección (normativo/técnico) si existe
  const lessonContext = getLessonContext(contentJson)

  // 🔥 NUEVO: Obtener siguiente actividad cuando ready_to_advance para transición fluida
  let nextActivityData = undefined
  if (verification.ready_to_advance && !currentActivityContext.isLastActivity) {
    const nextActivityRef = getNextActivity(contentJson, currentActivity.id)
    if (nextActivityRef) {
      nextActivityData = getActivityById(contentJson, nextActivityRef.activityId)
    }
  }

  // 🔍 DEBUG: Log información crítica para diagnosticar regresión a actividades anteriores
  logger.info('chat.stream.prompt_context', {
    sessionId,
    currentActivityId: currentActivity.id,
    currentActivityQuestion: currentActivity.verification.question.slice(0, 100),
    verificationReady: verification.ready_to_advance,
    verificationResponseType: verification.response_type,
    attempts: attempts + 1,
    studentMessage: message.slice(0, 50),
    messagesCount: sessionWithMessages.messages.length,
    completedActivitiesCount: completedActivityIds.length,
  })

  const { staticBlocks, dynamicPrompt } = buildSystemPrompt({
    activityContext: currentActivityContext,
    recentMessages: sessionWithMessages.messages,
    tangentCount,
    attempts,
    verificationResult: verification,
    completedActivities: completedActivityIds,
    intentClassification: intent,
    lessonContext,
    nextActivity: nextActivityData || undefined,
    lastUserMessage: message,  // Para detectar "no sé" y extraer escenario
    methodology: lessonSession.lesson.course?.methodology ?? 'REFLECTIVE',
    projectBrief: lessonSession.projectBrief ?? undefined,
    wasExplained,
    language: lessonSession.language,
  })

  // ═══════════════════════════════════════════════════════════════
  // 6. CREATE STREAMING RESPONSE CON PROMPT CACHING
  // ═══════════════════════════════════════════════════════════════
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  // Si el estudiante adjuntó archivos (imágenes / PDF), los convertimos en
  // bloques nativos de Claude para inyectarlos en el último mensaje del usuario.
  // Cualquier nota textual (formatos no soportados, etc.) se anexa al mensaje.
  const { blocks: attachmentBlocks, notes: attachmentNotes } =
    attachments && attachments.length > 0
      ? await processPlannerAttachments(attachments)
      : { blocks: [], notes: [] }

  const userMessageContent: string | Array<{ type: 'text'; text: string } | typeof attachmentBlocks[number]> =
    attachmentBlocks.length > 0
      ? [
          {
            type: 'text' as const,
            text:
              attachmentNotes.length > 0
                ? `${message}\n\n${attachmentNotes.join('\n\n')}`
                : message,
          },
          ...attachmentBlocks,
        ]
      : message

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream from Claude con bloques cacheables
        // maxTokens dinámico basado en complexity de la actividad
        const maxTokens = getMaxTokensForActivity(currentActivity.complexity)

        const claudeStream = await anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: maxTokens,
          system: [
            ...staticBlocks,
            { type: 'text', text: dynamicPrompt }
          ],
          messages: [
            ...compressedHistory,  // Historial comprimido (preguntas visibles)
            {
              role: 'user',
              content: userMessageContent,
            },
          ],
        })

        // Process stream events.
        // El marcador PROJECT_BRIEF (---PROJECT_BRIEF---{...}---END_PROJECT_BRIEF---)
        // se persiste server-side pero NUNCA debe verse en vivo al estudiante.
        // Buffer pequeño que retiene los últimos ~25 chars antes de reenviar al
        // cliente, así detectamos el inicio del marcador aunque venga partido en
        // varios chunks. Cuando aparece, suprimimos todo lo posterior.
        const PROJECT_BRIEF_MARK = '---PROJECT_BRIEF---'
        const HOLDBACK = PROJECT_BRIEF_MARK.length + 5
        let unsent = ''
        let suppressFurther = false

        const flushToClient = (text: string) => {
          if (!text) return
          const data = JSON.stringify({ type: 'content', text })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text
              if (suppressFurther) continue

              unsent += text
              const markerIdx = unsent.indexOf(PROJECT_BRIEF_MARK)
              if (markerIdx >= 0) {
                // Mandar la parte conversacional anterior al marcador y cortar.
                flushToClient(unsent.slice(0, markerIdx))
                suppressFurther = true
                unsent = ''
                continue
              }

              // Retener los últimos HOLDBACK chars por si el marcador llega partido.
              if (unsent.length > HOLDBACK) {
                flushToClient(unsent.slice(0, -HOLDBACK))
                unsent = unsent.slice(-HOLDBACK)
              }
            }
          } else if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
        }

        // Drenar el buffer si no apareció el marcador (caso normal sin brief).
        if (!suppressFurther && unsent) flushToClient(unsent)

        // Si Sophia emitió un PROJECT_BRIEF (cursos basados en proyecto),
        // extrae el JSON y limpia el marcador del mensaje persistido.
        const { brief: projectBrief, cleaned } = extractProjectBrief(fullResponse)
        let cleanedAssistantContent = cleaned

        // Fallback anti-burbuja-vacía: si el modelo devolvió una respuesta
        // vacía (o solo whitespace / solo un brief suprimido), el estudiante
        // quedaría mirando un mensaje en blanco sin saber cómo continuar
        // (observado en sesiones reales: tuvo que escribir "continua"/"ok").
        // Re-planteamos la pregunta de la actividad vigente para re-anclar.
        if (!cleanedAssistantContent.trim()) {
          const fallbackText = `Retomemos donde estábamos. ${currentActivity.verification.question}`
          logger.warn('chat.stream.empty_response_fallback', {
            sessionId,
            activityId: currentActivity.id,
            fullResponseLength: fullResponse.length,
            hadBrief: projectBrief !== null,
          })
          flushToClient(fallbackText)
          cleanedAssistantContent = fallbackText
        }

        // 4. Save messages to database (con activityId y timestamps explícitos para orden correcto)
        const userTimestamp = new Date()
        const assistantTimestamp = new Date(userTimestamp.getTime() + 1) // +1ms para garantizar orden

        await prisma.$transaction([
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'user',
              content: message,
              activityId: currentActivity.id,
              timestamp: userTimestamp,
            },
          }),
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'assistant',
              content: cleanedAssistantContent,
              inputTokens,
              outputTokens,
              activityId: currentActivity.id,
              timestamp: assistantTimestamp,
            },
          }),
          prisma.lessonSession.update({
            where: { id: sessionId },
            data: {
              lastActivityAt: assistantTimestamp,
              ...(projectBrief !== null
                ? { projectBrief: projectBrief as Prisma.InputJsonValue }
                : {}),
            },
          }),
        ])

        if (projectBrief !== null) {
          logger.info('chat.stream.project_brief_saved', {
            sessionId,
            userId: session.userId,
          })
        }

        // Log chat message
        logChatMessage(sessionId, 'assistant', fullResponse.length, {
          input: inputTokens,
          output: outputTokens,
        })

        // 5. Guardar resultado de verificación en ActivityProgress
        // (La verificación ya corrió ANTES del streaming, usamos ese resultado)
        // Usar ready_to_advance en lugar de solo completed para mayor flexibilidad
        if (verification.ready_to_advance) {
          // Marcar actividad como completada
          // Construir evidenceData con historial de intentos (como Instructoria)
          const newAttempt = {
            studentResponse: message,
            analysis: {
              ready_to_advance: verification.ready_to_advance,
              completed: verification.completed,
              criteriaMatched: verification.criteriaMatched,
              criteriaMissing: verification.criteriaMissing,
              understanding_level: verification.understanding_level,
              response_type: verification.response_type,
              completeness_percentage: verification.completeness_percentage,
            },
            timestamp: new Date().toISOString(),
          }
          const updatedEvidence = JSON.parse(JSON.stringify({
            attempts: [...(existingEvidence.attempts || []), newAttempt],
            // Preservar el conteo de desglose (informativo: cuántas sub-preguntas se usaron antes de completar)
            scaffoldingTurns,
            // Mantener el flag de explicación si ya se dio o se va a dar ahora
            wasExplained: wasExplained || willExplainThisTurn,
          }))

          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              status: 'COMPLETED',
              completedAt: new Date(),
              passedCriteria: true,
              aiFeedback: verification.feedback,
              attempts: attempts + 1,
              evidenceData: updatedEvidence,
            },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'COMPLETED',
              completedAt: new Date(),
              passedCriteria: true,
              aiFeedback: verification.feedback,
              attempts: attempts + 1,
              evidenceData: updatedEvidence,
            },
          })

          logger.info('chat.stream.activity_completed', {
            sessionId,
            activityId: currentActivity.id,
            attempts: attempts + 1,
            criteriaMatched: verification.criteriaMatched.length,
          })

          // 🔥 NUEVO: Notificar al frontend inmediatamente vía SSE
          const nextActivityContext = getNextActivity(contentJson, currentActivity.id)
          const totalActivities = getTotalActivities(contentJson)
          const completedCount = await prisma.activityProgress.count({
            where: {
              lessonSessionId: lessonSession.id,
              status: 'COMPLETED',
            },
          })

          const activityCompletedData = JSON.stringify({
            type: 'activity_completed',
            activityId: currentActivity.id,
            activityTitle: currentActivity.verification.question, // Usar pregunta como título
            nextActivityId: nextActivityContext?.activityId || null,
            nextActivityTitle: nextActivityContext ? 'Siguiente actividad' : null,
            isLastActivity: !nextActivityContext,
            currentPosition: completedCount + 1,
            completedCount: completedCount + 1,
            total: totalActivities,
            percentage: Math.round(((completedCount + 1) / totalActivities) * 100),
            completedAt: new Date().toISOString(),
          })

          // Enviar evento SSE al frontend para actualización instantánea
          controller.enqueue(encoder.encode(`data: ${activityCompletedData}\n\n`))

          logger.info('chat.stream.activity_completed_event_sent', {
            sessionId,
            activityId: currentActivity.id,
            percentage: Math.round(((completedCount + 1) / totalActivities) * 100),
          })

          // Auto-progresión a siguiente actividad (ahora usa nextActivityContext ya calculado)

          if (nextActivityContext) {
            // Hay siguiente actividad → actualizar sesión
            await prisma.lessonSession.update({
              where: { id: lessonSession.id },
              data: {
                activityId: nextActivityContext.activityId,
                lastActivityAt: new Date(),
              },
            })

            logger.info('chat.stream.activity_progressed', {
              sessionId,
              fromActivityId: currentActivity.id,
              toActivityId: nextActivityContext.activityId,
            })
          } else {
            // Era la última actividad → calcular nota y marcar lección como completada
            const allActivities = await prisma.activityProgress.findMany({
              where: {
                lessonSessionId: lessonSession.id,
                status: 'COMPLETED',
              },
              select: {
                activityId: true,
                attempts: true,
                tangentCount: true,
                evidenceData: true,
              },
            })

            // Identify which activities are evaluative (counts for grade)
            // Activities with verification.is_evaluative === false are skipped
            const activityEvaluativeMap = new Map<string, boolean>()
            for (const a of contentJson.activities) {
              activityEvaluativeMap.set(a.id, a.verification?.is_evaluative !== false)
            }

            // Scoring: comprensión (70%) + eficiencia (30%).
            // Shared formula — see lib/grading.ts
            // Only evaluate activities marked as evaluative
            const evaluativeActivities = allActivities.filter(ap =>
              activityEvaluativeMap.get(ap.activityId) !== false
            )

            // CODE: nota = % de pasos completados (sin rúbrica de comprensión).
            // REFLECTIVE: fórmula comprensión/eficiencia.
            const totalEvaluativeCount = Array.from(activityEvaluativeMap.values())
              .filter(Boolean).length
            const grade = lessonSession.lesson.course?.methodology === 'CODE'
              ? calculateCompletionGrade(evaluativeActivities.length, totalEvaluativeCount)
              : calculateGrade(evaluativeActivities)

            logger.info('chat.stream.grade_calculated', {
              sessionId,
              totalActivitiesCompleted: allActivities.length,
              evaluativeActivitiesCount: evaluativeActivities.length,
              grade,
            })

            await prisma.lessonSession.update({
              where: { id: lessonSession.id },
              data: {
                completedAt: new Date(),
                passed: isPassing(grade),
                progress: 100,
                grade,
              },
            })

            logger.info('chat.stream.lesson_completed', {
              sessionId,
              totalActivities,
              completedActivities: completedCount + 1,
              grade,
              duration: new Date().getTime() - new Date(lessonSession.startedAt).getTime(),
            })

            // Generate AI report asynchronously (don't block the response).
            // Pasamos objective + keyPoints para que el reporte tenga el ALCANCE
            // de la lección y no invente temas fuera de ese alcance. Language
            // de la sesión decide en qué idioma se genera el reporte.
            generateLessonReport(
              lessonSession.id,
              lessonTitle,
              lessonObjective,
              lessonKeyPoints,
              allActivities,
              grade,
              contentJson,
              lessonSession.language,
            ).catch((err: unknown) => {
              logger.error('chat.stream.report_generation_failed', { sessionId, error: String(err) })
            })
          }
        } else if (verification.response_type !== 'continuation' && !hallucinationCheck.isHallucination) {
          // Guardar evidencia + (condicionalmente) incrementar attempts.
          // Skip si: continuación ("sí", "listo") o hallucination de voz.
          //
          // FIX causa #13: cuando willScaffold === true significa que Sophia
          // va a desglosar el tema en una sub-pregunta. La respuesta del
          // estudiante NO es un intento fallido del criterio total — es
          // progreso parcial pedido por Sophia. Si lo contamos como attempt,
          // castigamos con penalty 0.90× a quien aprende incrementalmente
          // (el bug observado con María Céspedes en el demo del 03/06).
          // Solo incrementamos attempts cuando es un RETRY real del criterio
          // (sin scaffolding en curso).
          const failedAttempt = {
            studentResponse: message,
            analysis: {
              ready_to_advance: verification.ready_to_advance,
              completed: verification.completed,
              criteriaMatched: verification.criteriaMatched,
              criteriaMissing: verification.criteriaMissing,
              understanding_level: verification.understanding_level,
              response_type: verification.response_type,
              completeness_percentage: verification.completeness_percentage,
              wasScaffolding: willScaffold, // marca para auditoría/scoring
            },
            timestamp: new Date().toISOString(),
          }
          const failedEvidence = JSON.parse(JSON.stringify({
            attempts: [...(existingEvidence.attempts || []), failedAttempt],
            // Conservar y avanzar el contador de desglose si Sophia va a desglosar
            scaffoldingTurns: willScaffold ? scaffoldingTurns + 1 : scaffoldingTurns,
            // Mantener/setear el flag de explicación didáctica
            wasExplained: wasExplained || willExplainThisTurn,
          }))

          // Si es turno de scaffolding, NO contamos attempt — solo evidencia.
          const attemptsIncrement = willScaffold ? 0 : 1

          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              attempts: attempts + attemptsIncrement,
              evidenceData: failedEvidence,
            },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: attemptsIncrement,
              evidenceData: failedEvidence,
            },
          })

          if (willScaffold) {
            logger.info('chat.stream.scaffolding_progress', {
              sessionId,
              activityId: currentActivity.id,
              scaffoldingTurns: scaffoldingTurns + 1,
              attempts, // sin cambio
            })
          }

          // Forzar avance al llegar a 5 intentos
          // La IA ya dio la respuesta en el intento 5 (prompt-builder maneja esto)
          // Marcamos como completado con nivel "En inicio"
          const forcedAdvanceLimit = 5
          const newAttemptCount = attempts + 1

          if (newAttemptCount >= forcedAdvanceLimit) {
            // Buscar el mejor intento (mayor completeness_percentage)
            type AttemptAnalysis = { understanding_level?: string; completeness_percentage?: number }
            type AttemptRecord = { analysis?: AttemptAnalysis }
            const allAttempts = (existingEvidence.attempts || []) as AttemptRecord[]
            const currentAttempt: AttemptRecord = {
              analysis: {
                understanding_level: verification.understanding_level,
                completeness_percentage: verification.completeness_percentage,
              }
            }
            const bestAttempt = [...allAttempts, currentAttempt].reduce((best, att) => {
              const pct = att.analysis?.completeness_percentage || 0
              const bestPct = best.analysis?.completeness_percentage || 0
              return pct > bestPct ? att : best
            })

            const bestLevel = bestAttempt.analysis?.understanding_level || 'memorized'

            // Mark activity as completed by limit
            await prisma.activityProgress.update({
              where: {
                lessonSessionId_activityId: {
                  lessonSessionId: lessonSession.id,
                  activityId: currentActivity.id,
                },
              },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                passedCriteria: false, // Did not pass on merit
                aiFeedback: `Avanzó por límite de intentos (${forcedAdvanceLimit}). Mejor nivel: ${bestLevel}`,
              },
            })

            // Auto-advance to next activity
            const currentIdx = contentJson.activities.findIndex((a: { id: string }) => a.id === currentActivity.id)
            const nextAct = contentJson.activities[currentIdx + 1]

            if (nextAct) {
              await prisma.lessonSession.update({
                where: { id: lessonSession.id },
                data: { activityId: nextAct.id },
              })
            }

            // Notify frontend
            const forcedAdvanceData = JSON.stringify({
              type: 'forced_advance',
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              bestLevel,
              nextActivityId: nextAct?.id || null,
            })
            controller.enqueue(encoder.encode(`data: ${forcedAdvanceData}\n\n`))

            logger.info('chat.stream.forced_advance', {
              sessionId,
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              bestLevel,
              nextActivityId: nextAct?.id || null,
            })
          }
        }

        // 5. Detectar tangents e incrementar contador
        // 🔥 FIX: Un tangent es cuando el mensaje es OFF-TOPIC según intent classification
        // NO cuando simplemente no cumple criterios (podría ser pregunta de clarificación válida)
        const isTangent = !intent.is_on_topic || intent.intent === 'off_topic' || intent.intent === 'small_talk'

        if (isTangent) {
          await prisma.activityProgress.update({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            data: {
              tangentCount: tangentCount + 1,
            },
          })

          logger.info('chat.stream.tangent_detected', {
            sessionId,
            activityId: currentActivity.id,
            tangentCount: tangentCount + 1,
            maxAllowed: 3, // Valor fijo para tangentes
          })
        }

        // 6. Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        logError(
          error as Error,
          'chat.stream.error',
          { sessionId, userId: session.userId }
        )
        const errorData = JSON.stringify({
          type: 'error',
          message: 'Error al procesar respuesta',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
