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
  const { lessonId, isTest, startFromActivity } = await request.json() as {
    lessonId: string
    isTest?: boolean
    startFromActivity?: string // activityId to start from
  }

  // 3b. Test mode: only ADMIN/SUPERADMIN can create test sessions
  if (isTest) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 4. Check if lesson exists (test mode: allow unpublished)
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, ...(isTest ? {} : { isPublished: true }) },
    select: {
      id: true,
      title: true,
      keyPoints: true,
      contentJson: true,
      courseId: true,
      availableAt: true,
      closesAfterHours: true,
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

  // 4b. Look up student's section enrollment for this course
  let studentSectionId: string | null = null
  if (!isTest) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        section: { courseId: lesson.courseId },
      },
      select: { sectionId: true },
    })
    studentSectionId = enrollment?.sectionId || null
  }

  // 4c. Check availability using section schedule (fallback to lesson defaults)
  if (!isTest) {
    let effectiveAvailableAt = lesson.availableAt
    let effectiveClosesAfterHours = lesson.closesAfterHours

    if (studentSectionId) {
      const sectionSchedule = await prisma.sectionLessonSchedule.findUnique({
        where: { sectionId_lessonId: { sectionId: studentSectionId, lessonId } },
      })
      if (sectionSchedule) {
        effectiveAvailableAt = sectionSchedule.availableAt
        effectiveClosesAfterHours = sectionSchedule.closesAfterHours
      }
    }

    if (effectiveAvailableAt) {
      const now = new Date()
      const availableAt = new Date(effectiveAvailableAt)
      const closesAt = new Date(availableAt.getTime() + effectiveClosesAfterHours * 60 * 60 * 1000)

      if (now < availableAt) {
        return NextResponse.json(
          { error: 'Esta lección aún no está disponible' },
          { status: 400 }
        )
      }
      if (now > closesAt) {
        return NextResponse.json(
          { error: 'Esta sesión ya se cerró' },
          { status: 400 }
        )
      }
    }
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
      { error: 'La sesión no tiene actividades diseñadas' },
      { status: 400 }
    )
  }

  // 6. Determine starting activity
  const activities = contentJson?.activities || []
  let startActivityId = firstActivity.activityId

  if (isTest && startFromActivity) {
    const targetIdx = activities.findIndex((a) => a.id === startFromActivity)
    if (targetIdx >= 0) {
      startActivityId = startFromActivity
    }
  }

  // 7. Test mode: delete any existing test session for this lesson, then create fresh
  if (isTest) {
    const existingTest = await prisma.lessonSession.findFirst({
      where: {
        userId: session.user.id,
        lessonId,
        isTest: true,
      },
    })
    if (existingTest) {
      await prisma.lessonSession.delete({ where: { id: existingTest.id } })
    }

    const lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId,
        sessionAttempt: 1,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        activityId: startActivityId,
        isTest: true,
      },
    })

    // If starting from a later activity, mark previous ones as completed
    if (startFromActivity) {
      const targetIdx = activities.findIndex((a) => a.id === startFromActivity)
      if (targetIdx > 0) {
        const previousActivities = activities.slice(0, targetIdx)
        await prisma.activityProgress.createMany({
          data: previousActivities.map((a) => ({
            lessonSessionId: lessonSession.id,
            activityId: a.id,
            status: 'COMPLETED' as const,
            completedAt: new Date(),
          })),
        })
      }
    }

    logger.info('session.start.test_created', {
      sessionId: lessonSession.id,
      userId: session.user.id,
      lessonId,
      activityId: startActivityId,
    })

    return NextResponse.json({
      sessionId: lessonSession.id,
      isTest: true,
      lesson: {
        title: lesson.title,
        courseTitle: lesson.course.title,
      },
    })
  }

  // 8. Normal mode: Check for active session
  let lessonSession = await prisma.lessonSession.findFirst({
    where: {
      userId: session.user.id,
      lessonId: lessonId,
      isTest: false,
      endedAt: null,
    },
  })

  // 9. If no active session, create one with first activity
  if (!lessonSession) {
    lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonId,
        sessionAttempt: 1,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        activityId: firstActivity.activityId,
        sectionId: studentSectionId,
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

  // 10. Return session info
  return NextResponse.json({
    sessionId: lessonSession.id,
    lesson: {
      title: lesson.title,
      courseTitle: lesson.course.title,
    },
  })
}
