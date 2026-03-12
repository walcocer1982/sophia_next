import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { parseContentJson } from '@/lib/lesson-parser'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/session/skip-to-activity
 * Skip to a specific activity in a test session.
 * Marks all previous activities as completed, clears messages, and resets session state.
 * Only works on isTest sessions.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, activityId } = (await request.json()) as {
    sessionId: string
    activityId: string
  }

  if (!sessionId || !activityId) {
    return NextResponse.json({ error: 'sessionId and activityId are required' }, { status: 400 })
  }

  // Validate session belongs to user and is a test session
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      isTest: true,
    },
    include: {
      lesson: { select: { contentJson: true } },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Test session not found' }, { status: 404 })
  }

  // Parse activities and validate target
  const contentJson = parseContentJson(lessonSession.lesson.contentJson) as LessonContent
  const activities = contentJson?.activities || []
  const targetIdx = activities.findIndex((a) => a.id === activityId)

  if (targetIdx < 0) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  // Clear existing progress and messages, then set up new state
  await prisma.$transaction([
    // Delete all existing progress
    prisma.activityProgress.deleteMany({
      where: { lessonSessionId: sessionId },
    }),
    // Delete all messages (fresh start for the target activity)
    prisma.message.deleteMany({
      where: { sessionId },
    }),
    // Mark previous activities as completed
    ...activities.slice(0, targetIdx).map((a) =>
      prisma.activityProgress.create({
        data: {
          lessonSessionId: sessionId,
          activityId: a.id,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })
    ),
    // Update session to point to target activity
    prisma.lessonSession.update({
      where: { id: sessionId },
      data: {
        activityId,
        lastActivityAt: new Date(),
        completedAt: null,
        passed: false,
        progress: Math.round((targetIdx / activities.length) * 100),
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    activityId,
    activityIndex: targetIdx,
  })
}
