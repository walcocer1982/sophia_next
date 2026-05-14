import { getAuthOrGuest } from '@/lib/auth-or-guest'
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
  const session = await getAuthOrGuest()
  if (!session) {
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
        userId: session.userId,
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
        assessmentParticipant: {
          select: { firstName: true },
        },
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // If this is a guest assessment participant, get only the FIRST given name (no compound)
    const rawFirstName = lessonSession.assessmentParticipant?.firstName || null
    const participantFirstName = rawFirstName?.trim().split(/\s+/)[0] || null

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
    const greetingLine = participantFirstName
      ? `"Hola ${participantFirstName}, soy Sophia, tu instructora para esta lección sobre..."`
      : `"Hola, soy Sophia, tu instructora para esta lección sobre..."`

    const welcomeInstruction = `PRIMER MENSAJE DE LA LECCIÓN — CONVERSACIONAL PARA VOZ.

IDENTIDAD: Eres Sophia, instructora educativa (mujer).

${participantFirstName ? `NOMBRE DEL ESTUDIANTE: "${participantFirstName}". Salúdalo por su primer nombre.` : ''}

TAREA: Genera un mensaje de bienvenida CONVERSACIONAL para la lección "${lessonTitle}".

REGLAS CRÍTICAS DE FORMATO (este texto se va a leer en VOZ ALTA):
- TEXTO PLANO. NO uses asteriscos (**), guiones (-), numeración (1. 2. 3.), ni markdown.
- NO uses "Objetivo:" ni "Puntos clave:" como títulos sueltos. Intégralos en oraciones naturales.
- NO uses listas estructuradas. Habla de forma fluida y natural.
- Tono cálido, amigable, como una conversación entre amigos.

EJEMPLO CORRECTO:
"Hola Walther, soy Sophia. Hoy vamos a hablar sobre perforación subterránea en minas peruanas. Nuestro objetivo es que al final puedas identificar los principales métodos de perforación, los equipos que se usan en minas como Antamina y Cerro Lindo, y las normas de seguridad peruanas. Cuéntame, ¿has trabajado antes con este tema o lo estás explorando por primera vez?"

EJEMPLO INCORRECTO (NO HAGAS ESTO):
"Hola Walther. **Objetivo de aprendizaje:** Identificar los métodos. **Puntos clave:** 1. Métodos 2. Tipos 3. Normativa..."

LARGO TOTAL: 3-5 oraciones. NO más.

ESTRUCTURA NATURAL:
1. Saludo + presentación (1 oración) - di ${greetingLine}
2. Menciona qué van a aprender hoy de forma fluida (1-2 oraciones)
3. Pregunta sobre experiencia previa para conectar (1 oración)

NO asumas el género del estudiante. Usa formas neutras.

Genera el mensaje ahora, sin formato, conversacional.`

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
              userId: session.userId,
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
            userId: session.userId,
            inputTokens,
            outputTokens,
          })

          controller.close()
        } catch (error) {
          logger.error('chat.welcome.error', {
            sessionId,
            userId: session.userId,
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
      userId: session?.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response('Internal server error', { status: 500 })
  }
}
