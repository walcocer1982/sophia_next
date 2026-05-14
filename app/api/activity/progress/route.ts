import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { parseContentJson, getTotalActivities, getActivityPosition, getNextActivity } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * GET /api/activity/progress?sessionId=xxx
 * Obtener progreso actual de una sesión de lección
 */
export async function GET(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  try {
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.userId,
      },
      include: {
        lesson: {
          select: {
            title: true,
            contentJson: true,
          },
        },
        activities: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
        },
      },
    })

    if (!lessonSession) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    const contentJson = parseContentJson(lessonSession.lesson.contentJson) as LessonContent
    const totalActivities = getTotalActivities(contentJson)
    const completedCount = lessonSession.activities.length

    const percentage = totalActivities > 0
      ? Math.round((completedCount / totalActivities) * 100)
      : 0

    // Calcular posición actual
    let currentPosition = 1

    if (lessonSession.activityId) {
      currentPosition = getActivityPosition(contentJson, lessonSession.activityId)
    } else if (completedCount > 0) {
      const lastCompleted = lessonSession.activities[0]
      const nextActivity = getNextActivity(contentJson, lastCompleted.activityId)

      if (nextActivity) {
        currentPosition = getActivityPosition(contentJson, nextActivity.activityId)
      } else {
        currentPosition = totalActivities
      }
    }

    logger.info('activity.progress.fetched', {
      sessionId,
      userId: session.userId,
      completedCount,
      totalActivities,
      currentPosition,
      percentage,
    })

    return Response.json({
      sessionId: lessonSession.id,
      lessonTitle: lessonSession.lesson.title,
      currentActivityId: lessonSession.activityId,
      currentPosition,
      completedCount,
      progress: completedCount,
      total: totalActivities,
      percentage,
      lastCompleted: lessonSession.activities[0] || null,
      completedAt: lessonSession.completedAt,
      passed: lessonSession.passed,
    })
  } catch (error) {
    logger.error('activity.progress.error', {
      sessionId,
      userId: session.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
