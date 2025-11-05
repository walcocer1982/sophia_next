import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify user exists in database
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })

  if (!userExists) {
    console.error('❌ User not found in database:', session.user.id)
    return NextResponse.json(
      {
        error: 'User not found',
        message:
          'Your session is invalid. Please sign out and sign in again.',
      },
      { status: 403 }
    )
  }

  // 3. Parse body
  const { lessonId } = await request.json()

  // 4. Check if lesson exists and is published
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isPublished: true },
    select: { id: true, title: true, description: true, estimatedMinutes: true },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // 4. Check for active session
  let lessonSession = await prisma.lessonSession.findFirst({
    where: {
      userId: session.user.id,
      lessonId: lessonId,
      endedAt: null, // Active session
    },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
        take: 1, // Solo el welcome message
      },
    },
  })

  // 5. If no active session, create one
  if (!lessonSession) {
    lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonId,
        sessionAttempt: 1, // TODO: Calculate properly in MVP-3
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: {
        messages: true,
      },
    })

    // 6. Generate welcome message with Claude
    const welcomePrompt = `Eres un instructor especializado en ${lesson.title}.

Genera un mensaje de bienvenida breve y motivador para el estudiante. El mensaje debe:
- Ser breve (2-3 oraciones)
- Mencionar el título de la lección
- Invitar al estudiante a hacer preguntas
- Ser amigable y profesional

Responde solo con el mensaje de bienvenida, sin introducción adicional.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: welcomePrompt,
        },
      ],
    })

    const welcomeMessage =
      response.content[0].type === 'text'
        ? response.content[0].text
        : 'Hola, soy tu instructor. ¿En qué puedo ayudarte?'

    // 7. Save welcome message
    await prisma.message.create({
      data: {
        sessionId: lessonSession.id,
        role: 'assistant',
        content: welcomeMessage,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })

    lessonSession.messages = [
      {
        id: 'temp',
        sessionId: lessonSession.id,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        classId: null,
        momentId: null,
        activityId: null,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    ]
  }

  // 8. Return session info
  return NextResponse.json({
    sessionId: lessonSession.id,
    welcomeMessage: lessonSession.messages[0]?.content || '',
    lesson: {
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes,
    },
  })
}
