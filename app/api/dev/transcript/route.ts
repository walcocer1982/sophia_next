import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Solo en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // Obtener sesión con mensajes y progreso
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    include: {
      lesson: {
        select: { title: true, description: true },
      },
      messages: {
        orderBy: { timestamp: 'asc' },
      },
      activities: {
        where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        select: {
          activityId: true,
          status: true,
          attempts: true,
          tangentCount: true,
          passedCriteria: true,
          completedAt: true,
        },
      },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Construir transcript
  const currentActivity = lessonSession.activities.find(
    (a) => a.activityId === lessonSession.activityId
  )

  const transcript = {
    metadata: {
      sessionId: lessonSession.id,
      lessonTitle: lessonSession.lesson.title,
      lessonDescription: lessonSession.lesson.description,
      startedAt: lessonSession.startedAt.toISOString(),
      currentActivity: lessonSession.activityId,
      attempts: currentActivity?.attempts || 0,
      tangentCount: currentActivity?.tangentCount || 0,
      progress: lessonSession.progress,
      completedActivities: lessonSession.activities.filter((a) => a.status === 'COMPLETED')
        .length,
      totalActivities: lessonSession.activities.length,
    },
    messages: lessonSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    })),
  }

  return NextResponse.json(transcript)
}
