import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/voice/message
 * Saves a voice transcript as a message in the chat history.
 * Called by the client after each completed user/assistant turn from the Realtime API.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, role, content } = await request.json()

  if (!sessionId || !role || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Verify session belongs to user
  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const message = await prisma.message.create({
    data: {
      sessionId,
      role,
      content,
    },
  })

  return NextResponse.json({ id: message.id })
}
