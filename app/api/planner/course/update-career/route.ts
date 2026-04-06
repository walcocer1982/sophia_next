import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId, careerId } = await request.json()

  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
  }

  // Verify course exists and user has access
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { userId: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  if (course.userId !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { careerId: careerId || null },
  })

  return NextResponse.json({ success: true })
}
