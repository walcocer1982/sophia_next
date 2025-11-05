import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60s, Hobby: 10s

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, message } = await request.json()

  // 1. Validate session
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      endedAt: null, // Active only
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
        take: 10, // Last 10 messages for context
      },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 2. Build system prompt (MVP-1: simple hardcoded)
  const systemPrompt = `Eres un instructor especializado en "${lessonSession.lesson.title}".

Tu rol es:
- Responder preguntas del estudiante de forma clara y didáctica
- Usar ejemplos prácticos cuando sea posible
- Ser paciente y motivador
- Si el estudiante está confundido, replantear de otra forma

Descripción de la lección: ${lessonSession.lesson.description}

Responde de forma conversacional y amigable.`

  // 3. Build conversation history
  const conversationHistory = lessonSession.messages
    .reverse() // Oldest first
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // 4. Call Claude API
  const response = await anthropic.messages.create({
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

  const assistantMessage =
    response.content[0].type === 'text'
      ? response.content[0].text
      : 'Lo siento, no pude procesar tu mensaje.'

  // 5. Save both messages in transaction
  const [userMsg, assistantMsg] = await prisma.$transaction([
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
        content: assistantMessage,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }),
  ])

  // 6. Update lastActivityAt
  await prisma.lessonSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  })

  return NextResponse.json({
    message: assistantMessage,
    messageId: assistantMsg.id,
  })
}
