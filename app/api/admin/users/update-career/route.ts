import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/users/update-career — Assign career to a user
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: { careerId: careerId || null },
    select: { id: true, name: true, email: true, careerId: true },
  })

  return NextResponse.json({ success: true, user })
}
