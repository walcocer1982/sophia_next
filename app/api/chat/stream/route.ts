import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { getCurrentActivity, getFirstActivity, getNextActivity, getTotalActivities, getLessonContext, getActivityById } from '@/lib/lesson-parser'
import { buildSystemPrompt, getMaxTokensForActivity } from '@/lib/prompt-builder'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger, logChatMessage, logError } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { verifyActivityCompletion } from '@/lib/activity-verification'
import { moderateContent, getInterventionMessage } from '@/lib/services/moderation'
import { classifyIntent } from '@/lib/services/intent-classification'
import { compressMessagesForAPI } from '@/lib/message-summarizer'
import type { LessonContent } from '@/types/lesson'
import type { Message } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting: 10 mensajes por minuto
  const rateLimit = checkRateLimit(session.user.id, 10, 60)
  if (!rateLimit.allowed) {
    const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    logger.warn('rate_limit.exceeded', {
      userId: session.user.id,
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

  const { sessionId, message } = await request.json()

  // 1. Validate session and fetch full contentJson with course data
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
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
  const existingEvidence = (activityProgress?.evidenceData as { attempts?: Array<unknown> } | null) || { attempts: [] }

  // ═══════════════════════════════════════════════════════════════
  // 3. MODERACIÓN + CLASIFICACIÓN + VERIFICACIÓN EN PARALELO
  // ═══════════════════════════════════════════════════════════════
  // Backwards compatibility: support both old and new structure
  const currentActivityInstruction = currentActivity.teaching?.agent_instruction ||
    (currentActivity as { agent_instruction?: string }).agent_instruction || ''

  // 🔥 FIX: Buscar el último mensaje del INSTRUCTOR (no cualquier mensaje)
  const lastInstructorMessage = sessionWithMessages.messages.find(m => m.role === 'assistant')

  // 🔥 FIX: Detectar si el mensaje es una confirmación simple ("sí", "ok", "continuar")
  // para evitar verificar contra criterios de la actividad
  const CONTINUATION_REGEX = /^(si|sí|ok|vale|entendido|claro|continuar|siguiente|adelante|de acuerdo|perfecto|listo|vamos|dale|ya|bueno)(\s+(por\s+favor|porfavor|gracias))?[.!]?$/i
  const isContinuationMessage = CONTINUATION_REGEX.test(message.trim())

  // Si es continuación Y la actividad ya está completada, skip verification
  const activityAlreadyCompleted = activityProgress?.status === 'COMPLETED'

  const [moderation, intent, verification] = await Promise.all([
    moderateContent(message, { lessonTitle }),
    classifyIntent(message, currentActivity, {
      currentLesson: lessonTitle,
      currentActivity: currentActivityInstruction,
      lastInstructorQuestion: lastInstructorMessage?.content || undefined
    }),
    // Skip expensive AI verification for simple continuations
    (isContinuationMessage || activityAlreadyCompleted)
      ? Promise.resolve({
          completed: true,
          criteriaMatched: ['Confirmación del estudiante'],
          criteriaMissing: [],
          completeness_percentage: 100,
          understanding_level: 'understood' as const,
          response_type: 'correct' as const,
          feedback: '',
          confidence: 'high' as const,
          ready_to_advance: true,
        })
      : verifyActivityCompletion(message, currentActivity, conversationHistory)
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
  // 4. VERIFICAR MODERACIÓN - Intervenir sin guardar en BD
  // ═══════════════════════════════════════════════════════════════
  if (!moderation.is_safe) {
    logger.warn('chat.stream.moderation_blocked', {
      sessionId,
      userId: session.user.id,
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
  })

  // ═══════════════════════════════════════════════════════════════
  // 6. CREATE STREAMING RESPONSE CON PROMPT CACHING
  // ═══════════════════════════════════════════════════════════════
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

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
              content: message,
            },
          ],
        })

        // Process stream events
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text

              // Send chunk to client
              const data = JSON.stringify({
                type: 'content',
                text: text,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          } else if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
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
              content: fullResponse,
              inputTokens,
              outputTokens,
              activityId: currentActivity.id,
              timestamp: assistantTimestamp,
            },
          }),
          prisma.lessonSession.update({
            where: { id: sessionId },
            data: { lastActivityAt: assistantTimestamp },
          }),
        ])

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
            },
            timestamp: new Date().toISOString(),
          }
          const updatedEvidence = JSON.parse(JSON.stringify({
            attempts: [...(existingEvidence.attempts || []), newAttempt],
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
                attempts: true,
                tangentCount: true,
                evidenceData: true,
              },
            })

            // Scoring: comprensión × penalización intentos × penalización tangentes
            const comprehensionScores: Record<string, number> = {
              memorized: 40, understood: 70, applied: 85, analyzed: 100,
            }
            const attemptPenalty = [1.0, 0.85, 0.7, 0.6] // 1st, 2nd, 3rd, 4th+

            let totalScore = 0
            for (const ap of allActivities) {
              const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
              const lastAttempt = evidence?.attempts?.at(-1)
              const level = lastAttempt?.analysis?.understanding_level || 'memorized'
              const base = comprehensionScores[level] || 40
              const penalty = attemptPenalty[Math.min(ap.attempts - 1, 3)]
              const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
              totalScore += base * penalty * tangentPenalty
            }

            const grade = allActivities.length > 0
              ? Math.round(totalScore / allActivities.length)
              : 0

            await prisma.lessonSession.update({
              where: { id: lessonSession.id },
              data: {
                completedAt: new Date(),
                passed: true,
                progress: 100,
                grade,
              },
            })

            logger.info('chat.stream.lesson_completed', {
              sessionId,
              totalActivities,
              completedActivities: completedCount + 1,
              duration: new Date().getTime() - new Date(lessonSession.startedAt).getTime(),
            })
          }
        } else {
          // Incrementar attempts sin completar + guardar evidenceData
          const failedAttempt = {
            studentResponse: message,
            analysis: {
              ready_to_advance: verification.ready_to_advance,
              completed: verification.completed,
              criteriaMatched: verification.criteriaMatched,
              criteriaMissing: verification.criteriaMissing,
              understanding_level: verification.understanding_level,
              response_type: verification.response_type,
            },
            timestamp: new Date().toISOString(),
          }
          const failedEvidence = JSON.parse(JSON.stringify({
            attempts: [...(existingEvidence.attempts || []), failedAttempt],
          }))

          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              attempts: attempts + 1,
              evidenceData: failedEvidence,
            },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: attempts + 1,
              evidenceData: failedEvidence,
            },
          })

          // 🔥 NUEVO: Notificar al frontend cuando se alcanza max_attempts
          const maxAttempts = currentActivity.verification.max_attempts || 3
          const newAttemptCount = attempts + 1

          if (newAttemptCount >= maxAttempts) {
            const maxAttemptsData = JSON.stringify({
              type: 'max_attempts_reached',
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              maxAttempts,
              canSkip: true,  // El frontend puede ofrecer "continuar de todos modos"
              message: `Has alcanzado el máximo de ${maxAttempts} intentos. Puedes continuar si lo deseas.`,
            })
            controller.enqueue(encoder.encode(`data: ${maxAttemptsData}\n\n`))

            logger.info('chat.stream.max_attempts_reached', {
              sessionId,
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              maxAttempts,
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
          { sessionId, userId: session.user?.id }
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
