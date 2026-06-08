import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/sections/[sectionId]
 * Editar nombre y/o sede de una sección existente. Solo lead del curso o
 * SUPERADMIN. No permite cambiar courseId/periodId — para eso, borrar y crear.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params
  const body = (await request.json()) as {
    name?: string
    sedeId?: string | null
    isArchived?: boolean
    startDate?: string | null
    endDate?: string | null
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { userId: true } } },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, section.course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const updateData: {
    name?: string
    sedeId?: string | null
    isArchived?: boolean
    archivedAt?: Date | null
    startDate?: Date | null
    endDate?: Date | null
  } = {}

  // Archivar / desarchivar es la ÚNICA mutación permitida en una sección ya
  // archivada — el resto requiere desarchivar primero.
  if (typeof body.isArchived === 'boolean') {
    updateData.isArchived = body.isArchived
    updateData.archivedAt = body.isArchived ? new Date() : null
  } else if (section.isArchived) {
    return NextResponse.json(
      { error: 'Sección archivada (read-only). Desarchivala primero para editar.' },
      { status: 409 }
    )
  }

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    }
    updateData.name = trimmed
  }

  if (body.sedeId !== undefined) {
    if (body.sedeId) {
      const sede = await prisma.sede.findUnique({
        where: { id: body.sedeId },
        select: { id: true, isActive: true },
      })
      if (!sede || !sede.isActive) {
        return NextResponse.json({ error: 'Sede inválida o inactiva' }, { status: 400 })
      }
    }
    updateData.sedeId = body.sedeId
  }

  if (body.startDate !== undefined) {
    if (body.startDate === null || body.startDate === '') {
      updateData.startDate = null
    } else {
      const d = new Date(body.startDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 })
      }
      updateData.startDate = d
    }
  }

  if (body.endDate !== undefined) {
    if (body.endDate === null || body.endDate === '') {
      updateData.endDate = null
    } else {
      const d = new Date(body.endDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Fecha de fin inválida' }, { status: 400 })
      }
      updateData.endDate = d
    }
  }

  // Validar coherencia start ≤ end (considerando el valor final tras el merge)
  const finalStart = updateData.startDate !== undefined ? updateData.startDate : section.startDate
  const finalEnd = updateData.endDate !== undefined ? updateData.endDate : section.endDate
  if (finalStart && finalEnd && finalEnd < finalStart) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la de inicio' }, { status: 400 })
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const updated = await prisma.section.update({
    where: { id: sectionId },
    data: updateData,
    include: {
      period: { select: { id: true, name: true } },
      sede: { select: { id: true, code: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/admin/sections/[sectionId]
 * Elimina la sección. Solo si NO tiene inscripciones activas (cascade es
 * peligroso — un instructor podría borrar accidentalmente toda la cohorte).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      course: { select: { userId: true } },
      _count: { select: { enrollments: true } },
    },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, section.course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (section._count.enrollments > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${section._count.enrollments} estudiantes inscriptos. Quitalos primero.` },
      { status: 409 }
    )
  }

  await prisma.section.delete({ where: { id: sectionId } })
  return NextResponse.json({ success: true })
}
