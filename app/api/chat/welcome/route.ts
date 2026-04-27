import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { getFirstActivity, getCurrentActivity, getLessonContext } from '@/lib/lesson-parser'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/chat/welcome
 * Genera mensaje de bienvenida con streaming para una sesión de lección
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 })
    }

    // Get lesson info with course data
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
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
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // Obtener contenido de la lección
    const contentJson = await getLessonContent(lessonSession.lesson.id) as LessonContent

    if (!contentJson) {
      return new Response('Lesson content not found', { status: 404 })
    }

    // Datos del curso para el prompt
    const courseInstructor = lessonSession.lesson.course?.instructor || 'Eres un instructor experto y amable.'
    const lessonTitle = lessonSession.lesson.title
    const lessonObjective = lessonSession.lesson.objective || ''
    const lessonKeyPoints = lessonSession.lesson.keyPoints || []

    // Obtener primera actividad
    const firstActivity = getFirstActivity(contentJson)

    if (!firstActivity) {
      return new Response('No activities found in lesson', { status: 500 })
    }

    // Obtener contexto completo de la actividad
    const firstActivityContext = getCurrentActivity(
      contentJson,
      firstActivity.activityId,
      lessonTitle,
      lessonObjective,
      lessonKeyPoints,
      courseInstructor
    )

    if (!firstActivityContext) {
      return new Response('Activity context not found', { status: 500 })
    }

    // Obtener contexto de lección (normativo/técnico) si existe
    const lessonContext = getLessonContext(contentJson)

    // Usar el sistema de prompts completo con cache
    const { staticBlocks, dynamicPrompt } = buildSystemPrompt({
      activityContext: firstActivityContext,
      recentMessages: [],
      tangentCount: 0,
      lessonContext,
    })

    // Instrucción para mensaje de bienvenida - Presenta el tema e invita a aprender
    const welcomeInstruction = `PRIMER MENSAJE DE LA LECCIÓN.

IDENTIDAD: Eres Sophia, instructora educativa (mujer). SIEMPRE preséntate como "Sophia, tu instructora" — usa género femenino. NUNCA digas "soy tu instructor" (masculino).

TAREA: Genera el mensaje de bienvenida para la lección "${lessonTitle}".

ESTRUCTURA OBLIGATORIA (en este orden):
1. Saludo breve y presentación (1 oración) — di "Hola, soy Sophia, tu instructora para esta lección sobre..."
2. Menciona el OBJETIVO de aprendizaje de la lección
3. Lista los PUNTOS CLAVE que van a cubrir (usa los del sistema)
4. Invita al estudiante a comenzar: pregunta si tiene experiencia previa con el tema o si está listo para empezar

ESTILO:
- Tono conversacional pero estructurado
- Sin emojis
- Sin "Bienvenido" formal
- Sin exclamaciones exageradas
- Género femenino en TODA referencia a ti misma (instructora, lista, atenta, etc.)

IMPORTANTE: NO hagas la pregunta de verificación todavía. Primero debes ENSEÑAR el contenido de la primera actividad. La bienvenida solo presenta el tema e invita a empezar.

Genera el mensaje ahora.`

    // Stream response from Claude con bloques cacheables
    const stream = await anthropic.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: 600,
      system: [
        ...staticBlocks,
        { type: 'text', text: dynamicPrompt }
      ],
      messages: [{ role: 'user', content: welcomeInstruction }],
    })

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              fullContent += text
              controller.enqueue(encoder.encode(text))
            }
          }

          // Get final message data
          const finalMessage = await stream.finalMessage()
          inputTokens = finalMessage.usage.input_tokens
          outputTokens = finalMessage.usage.output_tokens

          // Check if welcome message already exists
          const existingWelcome = await prisma.message.findFirst({
            where: {
              sessionId,
              role: 'assistant',
            },
            select: { id: true },
          })

          if (existingWelcome) {
            logger.warn('chat.welcome.already_exists', {
              sessionId,
              userId: session.user?.id,
            })
            controller.close()
            return
          }

          // Save to DB
          await prisma.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullContent,
              inputTokens,
              outputTokens,
            },
          })

          logger.info('chat.welcome.generated', {
            sessionId,
            userId: session.user?.id,
            inputTokens,
            outputTokens,
          })

          controller.close()
        } catch (error) {
          logger.error('chat.welcome.error', {
            sessionId,
            userId: session.user?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('chat.welcome.request.error', {
      userId: session?.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response('Internal server error', { status: 500 })
  }
}
