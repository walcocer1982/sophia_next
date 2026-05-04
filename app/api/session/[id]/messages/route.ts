import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthOrGuest()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: id,
      userId: session.userId,
    },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
      },
      lesson: {
        select: {
          title: true,
          keyPoints: true,
        },
      },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    messages: lessonSession.messages,
    lesson: lessonSession.lesson,
  })
}
