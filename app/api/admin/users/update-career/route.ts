import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * POST /api/admin/users/update-career — Assign career to a user
 */
export async function POST(request: Request) {
  const session = await requireRole('SUPERADMIN')
  if (session instanceof NextResponse) return session

  const { userId, careerId } = (await request.json()) as {
    userId?: string
    careerId?: string | null
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // careerId can be null (unassign career)
  if (careerId) {
    const career = await prisma.career.findUnique({ where: { id: careerId } })
    if (!career) {
      return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })
    }
  }

  // Block career edits on guest/anonymous kiosko users.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (target?.email?.endsWith('@assessment.local')) {
    return NextResponse.json(
      {
        error:
          'No se puede asignar carrera a un participante anónimo de evaluación.',
      },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { careerId: careerId || null },
    select: { id: true, name: true, email: true, careerId: true },
  })

  return NextResponse.json({ success: true, user })
}
