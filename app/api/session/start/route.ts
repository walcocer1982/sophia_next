import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getLessonContent } from '@/lib/lesson-loader'
import { getFirstActivity } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

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
    select: {
      id: true,
      title: true,
      keyPoints: true,
      contentJson: true,
      course: {
        select: {
          title: true,
        },
      },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // 5. Get first activity from lesson content
  const contentJson = await getLessonContent(lessonId) as LessonContent
  const firstActivity = contentJson ? getFirstActivity(contentJson) : null

  if (!firstActivity) {
    logger.error('session.start.no_activities', {
      lessonId,
      userId: session.user.id,
    })
    return NextResponse.json(
      { error: 'Lesson has no activities' },
      { status: 500 }
    )
  }

  // 6. Check for active session
  let lessonSession = await prisma.lessonSession.findFirst({
    where: {
      userId: session.user.id,
      lessonId: lessonId,
      endedAt: null,
    },
  })

  // 7. If no active session, create one with first activity
  if (!lessonSession) {
    lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonId,
        sessionAttempt: 1,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        activityId: firstActivity.activityId, // 🔥 FIX: Inicializar con primera actividad
      },
    })

    logger.info('session.start.created', {
      sessionId: lessonSession.id,
      userId: session.user.id,
      lessonId,
      activityId: firstActivity.activityId,
    })
  } else {
    // Si existe pero no tiene activityId, actualizarlo
    if (!lessonSession.activityId) {
      lessonSession = await prisma.lessonSession.update({
        where: { id: lessonSession.id },
        data: { activityId: firstActivity.activityId },
      })

      logger.info('session.start.activity_initialized', {
        sessionId: lessonSession.id,
        activityId: firstActivity.activityId,
      })
    }
  }

  // 8. Return session info
  return NextResponse.json({
    sessionId: lessonSession.id,
    lesson: {
      title: lesson.title,
      courseTitle: lesson.course.title,
    },
  })
}
