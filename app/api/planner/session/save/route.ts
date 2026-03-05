import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SessionSaveSchema } from '@/lib/planner/validation'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = SessionSaveSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { lessonId, keyPoints, contentJson } = parseResult.data

  // Verify lesson exists and belongs to a course owned by the user
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

  if (lesson.course.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        keyPoints,
        contentJson,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session save error:', error)
    return NextResponse.json(
      { error: 'Error al guardar la sesión' },
      { status: 500 }
    )
  }
}
