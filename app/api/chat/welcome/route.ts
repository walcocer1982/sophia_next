import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { getFirstActivity } from '@/lib/lesson-parser'
import type { LessonContent } from '@/types/lesson'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

    // Get lesson info
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      include: {
        lesson: {
          select: {
            id: true, // Necesario para getLessonContent
            title: true,
            description: true,
          },
        },
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // Obtener contenido de la lección (desde archivo hardcodeado o DB)
    const contentJson = await getLessonContent(lessonSession.lesson.id) as LessonContent

    // Obtener primera actividad para personalizar la bienvenida
    let firstActivityTopic = ''
    if (contentJson) {
      const firstActivity = getFirstActivity(contentJson)
      if (firstActivity) {
        firstActivityTopic = firstActivity.activity.teaching.main_topic
      }
    }

    const welcomePrompt = `Eres un instructor especializado en ${lessonSession.lesson.title}.
${firstActivityTopic ? `\nVamos a comenzar explorando: ${firstActivityTopic}` : ''}

Genera un mensaje de bienvenida breve y motivador para el estudiante. El mensaje debe:
- Ser breve (2-3 oraciones)
- Mencionar el título de la lección${firstActivityTopic ? ' y el primer tema a explorar' : ''}
- Invitar al estudiante a hacer preguntas
- Ser amigable y profesional

Responde solo con el mensaje de bienvenida, sin introducción adicional.`

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [{ role: 'user', content: welcomePrompt }],
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

          // Check if welcome message already exists (idempotency)
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

          // Save to DB after streaming completes (only if doesn't exist)
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
