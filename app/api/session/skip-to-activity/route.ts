import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { parseContentJson } from '@/lib/lesson-parser'
import { nextSessionAttempt } from '@/lib/lesson-session'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/session/skip-to-activity
 * Skip to a specific activity in a test session.
 * Marks all previous activities as completed, clears messages, and resets session state.
 * Only works on isTest sessions.
 */
export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

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

  // No se borra nada (21 oct 2026): la prueba actual se cierra y queda como
  // evidencia, y se abre otra desde la actividad pedida. Antes se borraban los
  // mensajes y el progreso, y con ellos lo que el probador había hecho.
  const sessionAttempt = await nextSessionAttempt(session.user.id, lessonSession.lessonId)
  const [, nueva] = await prisma.$transaction([
    prisma.lessonSession.update({ where: { id: sessionId }, data: { endedAt: new Date() } }),
    prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonSession.lessonId,
        sessionAttempt,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        activityId,
        isTest: true,
        progress: Math.round((targetIdx / activities.length) * 100),
      },
    }),
  ])
  if (targetIdx > 0) {
    await prisma.activityProgress.createMany({
      data: activities.slice(0, targetIdx).map((a) => ({
        lessonSessionId: nueva.id,
        activityId: a.id,
        status: 'COMPLETED' as const,
        completedAt: new Date(),
      })),
    })
  }

  return NextResponse.json({
    success: true,
    sessionId: nueva.id,
    activityId,
    activityIndex: targetIdx,
  })
}
