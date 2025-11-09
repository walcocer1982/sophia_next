import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { getCurrentActivity, getFirstActivity, getNextActivity, getTotalActivities } from '@/lib/lesson-parser'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger, logChatMessage, logError } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { verifyActivityCompletion } from '@/lib/activity-verification'
import type { LessonContent } from '@/types/lesson'

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
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
      activities: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1, // Última actividad completada
      },
    },
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }

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
  let currentActivityContext
  const lastCompletedActivity = lessonSession.activities[0]

  if (lastCompletedActivity) {
    // Si hay actividad completada, obtener la siguiente
    const nextActivity = getCurrentActivity(contentJson, lastCompletedActivity.activityId)
    if (nextActivity) {
      currentActivityContext = nextActivity
    } else {
      // Si no hay siguiente, usar la primera (fallback)
      currentActivityContext = getFirstActivity(contentJson)
    }
  } else {
    // Si no hay progreso, empezar con la primera actividad
    currentActivityContext = getFirstActivity(contentJson)
  }

  if (!currentActivityContext) {
    return new Response('No activities found in lesson', { status: 500 })
  }

  const conversationHistory = lessonSession.messages.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // 3. 🔥 NUEVO: Verificación ANTICIPADA antes de generar respuesta
  const currentActivity = currentActivityContext.activity

  // Obtener intentos actuales
  const attempts = await prisma.activityProgress
    .findUnique({
      where: {
        lessonSessionId_activityId: {
          lessonSessionId: lessonSession.id,
          activityId: currentActivity.id,
        },
      },
      select: { attempts: true },
    })
    .then((ap) => ap?.attempts || 0)

  // Ejecutar verificación ANTES del streaming
  const verification = await verifyActivityCompletion(
    message,
    currentActivity,
    conversationHistory
  )

  logger.info('chat.stream.pre_verification', {
    sessionId,
    activityId: currentActivity.id,
    completed: verification.completed,
    confidence: verification.confidence,
    attempts: attempts + 1,
  })

  // 4. Build dynamic system prompt con resultado de verificación
  const systemPrompt = buildSystemPrompt({
    activityContext: currentActivityContext,
    recentMessages: lessonSession.messages,
    tangentCount: 0, // TODO: Calcular tangent count dinámicamente
    verificationResult: verification, // ← NUEVO: Pasar resultado de verificación
  })

  // 4. Create streaming response
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream from Claude
        const claudeStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
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
