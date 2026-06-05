import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/programacion/bulk-toggle
 *
 * Abre o cierra una lección para MÚLTIPLES secciones a la vez. Útil para
 * cursos transversales (Plan de Tutoría, Empleabilidad) que se dictan en
 * varias sedes — antes había que togglear lección por lección, sección por
 * sección. Ahora un solo click abre/cierra en todas.
 *
 * Body:
 *   {
 *     lessonId: string
 *     sectionIds: string[]
 *     publish: boolean
 *     availableAt?: string  // ISO date, default hoy
 *     closesAfterHours?: number  // default 3
 *   }
 *
 * Permisos: solo owner del curso o SUPERADMIN. ADMIN con misma carrera OK
 * para sus secciones.
 */
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const body = (await request.json()) as {
    lessonId?: string
    sectionIds?: string[]
    publish?: boolean
    availableAt?: string
    closesAfterHours?: number
  }

  if (!body.lessonId || !Array.isArray(body.sectionIds) || body.sectionIds.length === 0 || typeof body.publish !== 'boolean') {
    return NextResponse.json({ error: 'lessonId, sectionIds[] y publish son requeridos' }, { status: 400 })
  }

  // Verificar que la lección existe + permisos sobre el curso
  const lesson = await prisma.lesson.findUnique({
    where: { id: body.lessonId },
    select: {
      id: true,
      course: { select: { userId: true, careerId: true } },
    },
  })
  if (!lesson) {
    return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
  }

  const canEdit =
    isOwnerOrSuperadmin(session, lesson.course.userId) ||
    isAdminSameCareer(session, lesson.course.careerId)
  if (!canEdit) {
    return NextResponse.json({ error: 'No autorizado para este curso' }, { status: 403 })
  }

  const closesAfterHours = body.closesAfterHours && body.closesAfterHours > 0 ? body.closesAfterHours : 3

  if (body.publish) {
    const availableAt = body.availableAt ? new Date(body.availableAt) : new Date()
    if (isNaN(availableAt.getTime())) {
      return NextResponse.json({ error: 'availableAt inválida' }, { status: 400 })
    }

    // Upsert por cada sectionId
    const results = await Promise.all(
      body.sectionIds.map((sectionId) =>
        prisma.sectionLessonSchedule.upsert({
          where: { sectionId_lessonId: { sectionId, lessonId: body.lessonId! } },
          create: { sectionId, lessonId: body.lessonId!, availableAt, closesAfterHours },
          update: { availableAt, closesAfterHours },
        })
      )
    )

    // Marcar lección como publicada globalmente (lo activan al menos N secciones)
    await prisma.lesson.update({
      where: { id: body.lessonId },
      data: { isPublished: true },
    })

    logger.info('programacion.bulk_open', {
      lessonId: body.lessonId,
      sectionsAffected: results.length,
      availableAt: availableAt.toISOString(),
    })

    return NextResponse.json({
      success: true,
      affected: results.length,
      action: 'opened',
    })
  } else {
    // Cerrar: deleteMany
    const result = await prisma.sectionLessonSchedule.deleteMany({
      where: {
        lessonId: body.lessonId,
        sectionId: { in: body.sectionIds },
      },
    })

    logger.info('programacion.bulk_close', {
      lessonId: body.lessonId,
      sectionsAffected: result.count,
    })

    return NextResponse.json({
      success: true,
      affected: result.count,
      action: 'closed',
    })
  }
}
