import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role || 'STUDENT'
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { courseId } = (await request.json()) as { courseId?: string }
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Verify ownership
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: session.user.id, deletedAt: null },
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
