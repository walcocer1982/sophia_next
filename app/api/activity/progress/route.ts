import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseContentJson, getCurrentActivity, getTotalActivities, getActivityPosition, getNextActivity } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * GET /api/activity/progress?sessionId=xxx
 * Obtener progreso actual de una sesión de lección
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
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
        userId: session.user.id,
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

    const currentActivity = lessonSession.activityId
      ? getCurrentActivity(contentJson, lessonSession.activityId)
      : null

    const percentage = totalActivities > 0
      ? Math.round((completedCount / totalActivities) * 100)
      : 0

    // Calcular posición actual (1-indexed) correctamente
    let currentPosition = 1 // Default: primera actividad

    if (lessonSession.activityId) {
      // Si hay activityId en sesión, obtener su posición
      currentPosition = getActivityPosition(contentJson, lessonSession.activityId)
    } else if (completedCount > 0) {
      // Si no hay activityId pero hay actividades completadas, calcular siguiente
      const lastCompleted = lessonSession.activities[0]
      const nextActivity = getNextActivity(contentJson, lastCompleted.activityId)

      if (nextActivity) {
        currentPosition = getActivityPosition(contentJson, nextActivity.activity.id)
      } else {
        // Si no hay siguiente, es porque completó todas
        currentPosition = totalActivities
      }
    }

    logger.info('activity.progress.fetched', {
      sessionId,
      userId: session.user.id,
      completedCount,
      totalActivities,
      currentPosition,
      percentage,
    })

    return Response.json({
      sessionId: lessonSession.id,
      lessonTitle: lessonSession.lesson.title,
      currentActivity: currentActivity?.activity.teaching.main_topic || null,
      currentActivityId: lessonSession.activityId,
      currentPosition,
      completedCount,
      progress: completedCount, // Mantener por compatibilidad
      total: totalActivities,
      percentage,
      lastCompleted: lessonSession.activities[0] || null,
      completedAt: lessonSession.completedAt,
      passed: lessonSession.passed,
    })
  } catch (error) {
    logger.error('activity.progress.error', {
      sessionId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
