import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { AI_CONFIG } from '@/lib/ai-config'
import { getCurrentActivity, getFirstActivity, getNextActivity, getTotalActivities } from '@/lib/lesson-parser'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger, logChatMessage, logError } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { verifyActivityCompletion, buildVerificationPrompt } from '@/lib/activity-verification'
import type { LessonContent } from '@/types/lesson'
import type { Message } from '@prisma/client'

export const runtime = 'nodejs'
// Note: Next.js route configs require literal values, not runtime expressions
// If you need to change maxDuration, update AI_CONFIG.timeouts.vercelMaxDuration
// and then update this literal value to match
export const maxDuration = 60 // AI_CONFIG.timeouts.vercelMaxDuration

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting
  const rateLimit = checkRateLimit(
    session.user.id,
    AI_CONFIG.rateLimit.messagesPerMinute,
    AI_CONFIG.rateLimit.windowSeconds
  )
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
          'X-RateLimit-Limit': AI_CONFIG.rateLimit.messagesPerMinute.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  }

  const { sessionId, message } = await request.json()

  // 1. Validate session and fetch full contentJson
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      endedAt: null,
    },
    include: {
      lesson: {
        select: {
          id: true, // Necesario para getLessonContent
          title: true,
          description: true,
          // contentJson lo obtenemos de getLessonContent
        },
      },
      activities: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },  // Orden cronológico
        // 🔥 FIX 3: Obtener TODAS las completadas para memoria del prompt
      },
    },
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }

  // Query mensajes filtrados por actividad actual
  const messages = await prisma.message.findMany({
    where: {
      sessionId: lessonSession.id,
      OR: [
        { activityId: lessonSession.activityId },  // Mensajes de actividad actual
        { activityId: null },  // Mensajes globales (welcome)
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: AI_CONFIG.history.chatContext,
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

  // Obtener actividad actual basada en progreso
  // 🔥 FIX: Usar lessonSession.activityId como source of truth (actualizado en auto-progresión)
  let currentActivityContext

  if (lessonSession.activityId) {
    // DB tiene el activityId correcto después de auto-progresión
    currentActivityContext = getCurrentActivity(contentJson, lessonSession.activityId)
  } else {
    // Fallback: Primera vez, no hay activityId aún
    currentActivityContext = getFirstActivity(contentJson)
  }

  if (!currentActivityContext) {
    return new Response('No activities found in lesson', { status: 500 })
  }

  const conversationHistory = sessionWithMessages.messages.reverse().map((m: Message) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

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
    select: { attempts: true, tangentCount: true },
  })

  const attempts = activityProgress?.attempts || 0
  const tangentCount = activityProgress?.tangentCount || 0

  // Ejecutar verificación ANTES del streaming
  const verification = await verifyActivityCompletion(
    message,
    currentActivity
  )

  logger.info('chat.stream.pre_verification', {
    sessionId,
    activityId: currentActivity.id,
    completed: verification.completed,
    confidence: verification.confidence,
    attempts: attempts + 1,
  })

  // 🔥 FIX 3: Obtener lista de actividades completadas para contexto del prompt
  const completedActivityIds = lessonSession.activities
    .filter(a => a.status === 'COMPLETED')
    .map(a => a.activityId)

  // 4. Build dynamic system prompt con resultado de verificación
  const systemPrompt = buildSystemPrompt({
    activityContext: currentActivityContext,
    tangentCount,
    attempts,
    verificationResult: verification,
    completedActivities: completedActivityIds,
  })

  // 4. Create streaming response
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 🔍 DEBUG: Enviar prompts completos al frontend (solo en development)
        if (process.env.NODE_ENV === 'development') {
          const promptDebugData = JSON.stringify({
            type: 'prompt_debug',
            // Verification prompt (ejecutado PRIMERO)
            verificationPrompt: {
              prompt: buildVerificationPrompt(message, currentActivity),
              result: verification,
              model: AI_CONFIG.models.verification,
              maxTokens: AI_CONFIG.tokens.verification,
            },
            // System prompt (ejecutado DESPUÉS, usa resultado de verificación)
            systemPrompt,
            metadata: {
              activityId: currentActivity.id,
              activityTitle: currentActivity.teaching.main_topic,
              activityType: currentActivity.type,
              attempts: attempts + 1, // +1 porque estamos en el intento actual
              tangentCount,
              maxTangents: currentActivity.student_questions.max_tangent_responses,
              verification: {
                completed: verification.completed,
                confidence: verification.confidence,
                criteriaMatched: verification.criteriaMatched.length,
                totalCriteria: currentActivity.verification.criteria.length,
              },
              completedActivitiesCount: completedActivityIds.length,
            },
          })
          controller.enqueue(encoder.encode(`data: ${promptDebugData}\n\n`))
        }

        // Stream from Claude
        const claudeStream = await anthropic.messages.stream({
          model: AI_CONFIG.models.chat,
          max_tokens: AI_CONFIG.tokens.chat,
          system: systemPrompt,
          messages: [
            ...conversationHistory,
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

        // 4. Save messages to database
        await prisma.$transaction([
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'user',
              content: message,
            },
          }),
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'assistant',
              content: fullResponse,
              inputTokens,
              outputTokens,
            },
          }),
          prisma.lessonSession.update({
            where: { id: sessionId },
            data: { lastActivityAt: new Date() },
          }),
        ])

        // Log chat message
        logChatMessage(sessionId, 'assistant', fullResponse.length, {
          input: inputTokens,
          output: outputTokens,
        })

        // 5. Guardar resultado de verificación en ActivityProgress
        // (La verificación ya corrió ANTES del streaming, usamos ese resultado)
        if (verification.completed) {
          // Marcar actividad como completada
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
            },
            create: {
              lessonSessionId: lessonSession.id,
              classId: '',
              momentId: '',
              activityId: currentActivity.id,
              status: 'COMPLETED',
              completedAt: new Date(),
              passedCriteria: true,
              aiFeedback: verification.feedback,
              attempts: attempts + 1,
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
            activityTitle: currentActivity.teaching.main_topic,
            nextActivityId: nextActivityContext?.activity.id || null,
            nextActivityTitle: nextActivityContext?.activity.teaching.main_topic || null,
            isLastActivity: !nextActivityContext,
            currentPosition: nextActivityContext ? nextActivityContext.activityIdx + 1 : totalActivities,
            completedCount: completedCount + 1, // +1 porque acabamos de completar
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
                activityId: nextActivityContext.activity.id,
                momentId: '',
                lastActivityAt: new Date(),
              },
            })

            logger.info('chat.stream.activity_progressed', {
              sessionId,
              fromActivityId: currentActivity.id,
              toActivityId: nextActivityContext.activity.id,
              progress: `${nextActivityContext.activityIdx + 1}/${nextActivityContext.totalActivities}`,
            })
          } else {
            // Era la última actividad → marcar lección como completada
            const totalActivities = getTotalActivities(contentJson)
            const completedCount = await prisma.activityProgress.count({
              where: {
                lessonSessionId: lessonSession.id,
                status: 'COMPLETED',
              },
            })

            await prisma.lessonSession.update({
              where: { id: lessonSession.id },
              data: {
                completedAt: new Date(),
                passed: true,
                progress: 100,
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
          // Incrementar attempts sin completar
          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              attempts: attempts + 1,
            },
            create: {
              lessonSessionId: lessonSession.id,
              classId: '',
              momentId: '',
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: attempts + 1,
            },
          })
        }

        // 5. Detectar tangents e incrementar contador
        // Un tangent es cuando el usuario NO cumple ningún criterio (pregunta off-topic)
        const isTangent = !verification.completed && verification.criteriaMatched.length === 0

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
            maxAllowed: currentActivity.student_questions.max_tangent_responses,
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
