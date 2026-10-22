import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { cierreDeHorario } from '@/lib/monitor'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * El instructor termina (o reabre) el bloque de Sophia de una sección y una
 * sesión (22 oct 2026). Escribe `closedAt` en el horario; desde ahí la ventana
 * cuenta como cerrada en el Monitor, la ficha, la pantalla del alumno y el chat.
 *
 *   POST { sectionId, lessonId, accion: 'cerrar' | 'reabrir' } → { closedAt, cierre }
 */
export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = session.user.role
  if (rol !== 'ADMIN' && rol !== 'SUPERADMIN' && rol !== 'INSTRUCTOR') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { courseId } = await params
  const { sectionId, lessonId, accion } = (await request.json().catch(() => ({}))) as { sectionId?: string; lessonId?: string; accion?: string }
  if (!sectionId || !lessonId || (accion !== 'cerrar' && accion !== 'reabrir')) {
    return NextResponse.json({ error: 'Faltan sectionId, lessonId o accion (cerrar | reabrir)' }, { status: 400 })
  }

  const { alcance } = await alcanceEfectivo(session)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const seccion = await prisma.section.findFirst({ where: { AND: [{ id: sectionId, courseId }, filtro] }, select: { id: true, name: true } })
  if (!seccion) return NextResponse.json({ error: 'Esa sección no está a tu alcance' }, { status: 403 })

  const horario = await prisma.sectionLessonSchedule.findUnique({ where: { sectionId_lessonId: { sectionId, lessonId } } })
  if (!horario) return NextResponse.json({ error: 'La sección no tiene programada esta sesión' }, { status: 404 })

  const h = await prisma.sectionLessonSchedule.update({
    where: { id: horario.id },
    data: accion === 'cerrar' ? { closedAt: new Date(), closedById: session.user.id } : { closedAt: null, closedById: null },
  })
  logger.info('monitor.bloque', { accion, courseId, sectionId, lessonId, por: session.user.id })
  return NextResponse.json({ closedAt: h.closedAt, cierre: cierreDeHorario(h) })
}
