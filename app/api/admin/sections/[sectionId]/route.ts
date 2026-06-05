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

  const updateData: { name?: string; sedeId?: string | null } = {}

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
