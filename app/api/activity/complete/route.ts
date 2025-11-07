import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseContentJson, getNextActivity } from '@/lib/lesson-parser'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/activity/complete
 * Marcar actividad como completada y retornar siguiente actividad
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { sessionId, activityId } = await request.json()

  if (!sessionId || !activityId) {
    return new Response('Missing sessionId or activityId', { status: 400 })
  }

  try {
    // 1. Validar que la sesión pertenece al usuario
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        endedAt: null,
      },
      include: {
        lesson: {
          select: {
            contentJson: true,
          },
        },
        activities: {
          where: { activityId },
        },
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // 2. Verificar que la actividad no esté ya completada
    if (lessonSession.activities.length > 0) {
      return Response.json({
        success: false,
        message: 'Activity already completed',
      })
    }

    // 3. Parsear contentJson para obtener siguiente actividad
    const contentJson = parseContentJson(
      lessonSession.lesson.contentJson
    ) as LessonContent
    const nextActivityContext = getNextActivity(contentJson, activityId)

    // 4. Marcar actividad como completada
    await prisma.$transaction([
      prisma.activityProgress.create({
        data: {
          lessonSessionId: sessionId,
          classId: '', // TODO: Obtener del contentJson
          momentId: '', // TODO: Obtener del contentJson
          activityId,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      }),
      prisma.lessonSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() },
      }),
    ])

    // 5. Calcular progreso general de la sesión
    const totalActivitiesCompleted = await prisma.activityProgress.count({
      where: {
        lessonSessionId: sessionId,
        status: 'COMPLETED',
      },
    })

    // 6. Retornar resultado
    return Response.json({
      success: true,
      activityCompleted: activityId,
      nextActivity: nextActivityContext
        ? {
            id: nextActivityContext.activity.id,
            title: nextActivityContext.activity.teaching.main_topic,
            type: nextActivityContext.activity.type,
            isLast: nextActivityContext.isLastActivity,
          }
        : null,
      progress: {
        totalCompleted: totalActivitiesCompleted,
        totalActivities: nextActivityContext?.totalActivities || 0,
        percentage: nextActivityContext
          ? Math.round(
              (totalActivitiesCompleted / nextActivityContext.totalActivities) *
                100
            )
          : 100,
      },
    })
  } catch (error) {
    console.error('❌ Error completing activity:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
