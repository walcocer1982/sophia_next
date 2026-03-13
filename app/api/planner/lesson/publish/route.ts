import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { lessonId, publish } = (await request.json()) as {
    lessonId: string
    publish: boolean
  }

  if (!lessonId || typeof publish !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      course: { select: { userId: true } },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, lesson.course.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isPublished: publish },
  })

  return NextResponse.json({ success: true, isPublished: publish })
}
