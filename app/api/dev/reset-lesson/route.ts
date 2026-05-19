import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getLessonSessionSafe } from '@/lib/lesson-session'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/dev/reset-lesson
 * Reiniciar sesión de lección (solo en desarrollo)
 * Elimina completamente la sesión (cascade delete elimina mensajes y progreso)
 */
export async function POST(request: Request) {
  // 🔒 Bloquear en producción
  if (process.env.NODE_ENV !== 'development') {
    logger.warn('dev.reset.blocked', {
      reason: 'Not in development mode',
    })
    return new Response('Not available in production', { status: 403 })
  }

  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const { sessionId } = await request.json()

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  try {
    // 1. Validar que la sesión pertenece al usuario
    const lessonSession = await getLessonSessionSafe(sessionId, session.user.id, {
      mustBeActive: true,
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // 2. Eliminar la sesión completa (cascade delete elimina mensajes y progreso)
    await prisma.lessonSession.delete({
      where: { id: lessonSession.id },
    })

    logger.info('dev.reset.success', {
      sessionId: lessonSession.id,
      userId: session.user.id,
    })

    return Response.json({
      success: true,
      message: 'Sesión reiniciada correctamente',
      redirect: '/lessons',
    })
  } catch (error) {
    logger.error('dev.reset.error', {
      sessionId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response('Internal server error', { status: 500 })
  }
}
