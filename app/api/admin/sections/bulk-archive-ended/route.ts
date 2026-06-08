import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/admin/sections/bulk-archive-ended
 *
 * Archiva todas las secciones cuya endDate es anterior a (hoy - graceDays).
 * Pensado para el flujo de cursos cortos (2-4 sem) que se acumulan dentro
 * del mismo período/ciclo: una vez por semana corrés esto y el listado de
 * Programación queda limpio.
 *
 * Body:
 *   {
 *     periodId?: string       // si se pasa, solo dentro de ese período
 *     graceDays?: number      // default 7 — tolerancia tras la fecha de fin
 *     dryRun?: boolean        // si true, no aplica, solo cuenta
 *   }
 *
 * Permisos: SUPERADMIN/ADMIN. Solo afecta secciones que NO están ya archivadas
 * y que TIENEN endDate definida (las que no la tienen no se tocan — no hay
 * forma de saber si terminaron).
 */
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const body = (await request.json().catch(() => ({}))) as {
    periodId?: string
    graceDays?: number
    dryRun?: boolean
  }

  const graceDays = typeof body.graceDays === 'number' && body.graceDays >= 0 ? body.graceDays : 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - graceDays)

  const where = {
    isArchived: false,
    endDate: { lt: cutoff, not: null },
    ...(body.periodId ? { periodId: body.periodId } : {}),
  }

  const candidates = await prisma.section.findMany({
    where,
    select: { id: true, name: true, endDate: true, periodId: true },
  })

  if (body.dryRun) {
    return NextResponse.json({
      wouldArchive: candidates.length,
      candidates: candidates.slice(0, 50),
      graceDays,
      cutoff: cutoff.toISOString(),
    })
  }

  if (candidates.length === 0) {
    return NextResponse.json({ archived: 0, cutoff: cutoff.toISOString() })
  }

  const now = new Date()
  const result = await prisma.section.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { isArchived: true, archivedAt: now },
  })

  logger.info('programacion.bulk_archive_ended', {
    archived: result.count,
    cutoff: cutoff.toISOString(),
    graceDays,
    periodId: body.periodId ?? null,
  })

  return NextResponse.json({ archived: result.count, cutoff: cutoff.toISOString() })
}
