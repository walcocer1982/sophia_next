import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/periods/[periodId]
 *
 * Toggle isActive (cerrar/reactivar) o renombrar. Cerrar un período NO
 * borra nada — solo lo oculta de la vista por default de Programación.
 * Las secciones, estudiantes, schedules y notas quedan intactos como
 * histórico accesible vía Monitor y vía "Ver cerrados" en Programación.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const result = await requireRole('SUPERADMIN')
  if (result instanceof NextResponse) return result

  const { periodId } = await params
  const body = (await request.json()) as { isActive?: boolean; name?: string }

  const data: { isActive?: boolean; name?: string } = {}

  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive
  }
  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    }
    data.name = trimmed
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const period = await prisma.academicPeriod.update({
    where: { id: periodId },
    data,
    include: { _count: { select: { sections: true } } },
  })

  return NextResponse.json(period)
}

/**
 * DELETE /api/admin/periods/[periodId]
 * Solo si no tiene secciones (proteccion contra borrar histórico). Si las
 * tiene, sugiere cerrarlo (isActive=false) en vez de eliminarlo.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const result = await requireRole('SUPERADMIN')
  if (result instanceof NextResponse) return result

  const { periodId } = await params

  const period = await prisma.academicPeriod.findUnique({
    where: { id: periodId },
    include: { _count: { select: { sections: true } } },
  })

  if (!period) {
    return NextResponse.json({ error: 'Período no encontrado' }, { status: 404 })
  }

  if (period._count.sections > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: tiene ${period._count.sections} secciones. Cerralo (toggle Activo) en vez de borrarlo para conservar el histórico.`,
      },
      { status: 409 }
    )
  }

  await prisma.academicPeriod.delete({ where: { id: periodId } })
  return NextResponse.json({ success: true })
}
