import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * GET /api/user/select-career — List available careers
 */
export async function GET() {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return NextResponse.json({ careers })
}

/**
 * POST /api/user/select-career — Onboarding del estudiante.
 * Guarda sede + carrera + admisión. Valida que la carrera se dicte en la
 * sede elegida y que el período de admisión esté activo.
 */
export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const { sedeId, careerId, admissionPeriodId } = (await request.json()) as {
    sedeId?: string
    careerId?: string
    admissionPeriodId?: string
  }

  if (!sedeId || !careerId || !admissionPeriodId) {
    return NextResponse.json(
      { error: 'sedeId, careerId y admissionPeriodId son requeridos' },
      { status: 400 }
    )
  }

  const [sede, period] = await Promise.all([
    prisma.sede.findFirst({
      where: { id: sedeId, isActive: true },
      select: { id: true, careers: { where: { id: careerId }, select: { id: true } } },
    }),
    prisma.academicPeriod.findFirst({
      where: { id: admissionPeriodId, isActive: true },
      select: { id: true },
    }),
  ])

  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }
  if (sede.careers.length === 0) {
    return NextResponse.json(
      { error: 'La carrera no se dicta en la sede seleccionada' },
      { status: 400 }
    )
  }
  if (!period) {
    return NextResponse.json({ error: 'Período de admisión no válido' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sedeId, careerId, admissionPeriodId },
  })

  return NextResponse.json({ success: true })
}
