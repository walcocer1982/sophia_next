import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { sessionId, message } = await request.json()

  // 1. Validate session
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      endedAt: null,
    },
    include: {
      lesson: {
        select: {
          title: true,
          description: true,
        },
      },
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
    },
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }

  // 2. Build system prompt
  const systemPrompt = `Eres un instructor especializado en "${lessonSession.lesson.title}".

Tu rol es:
- Responder preguntas del estudiante de forma clara y didáctica
- Usar ejemplos prácticos cuando sea posible
- Ser paciente y motivador
- Si el estudiante está confundido, replantear de otra forma

Descripción de la lección: ${lessonSession.lesson.description}

Responde de forma conversacional y amigable.`

  const conversationHistory = lessonSession.messages.reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // 3. Create streaming response
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

        // 5. Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        console.error('❌ Streaming error:', error)
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
