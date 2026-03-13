import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId } = (await request.json()) as { courseId?: string }
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const isSuperadmin = session.user.role === 'SUPERADMIN'

  // Verify ownership (SUPERADMIN can delete any course)
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
      ...(isSuperadmin ? {} : { userId: session.user.id }),
    },
    select: { id: true, title: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Soft delete
  await prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true, message: `Curso "${course.title}" eliminado` })
}
