import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { hardcodedLesson } from '@/data/lesson01'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify user exists in database
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  })

  if (!userExists) {
    console.error('❌ User not found in database:', session.user.id)
    return NextResponse.json(
      {
        error: 'User not found',
        message:
          'Your session is invalid. Please sign out and sign in again.',
      },
      { status: 403 }
    )
  }

  // 3. Parse body
  const { lessonId } = await request.json()

  // 4. Check if lesson exists and is published
  const useHardcodedLesson = process.env.ALLOW_HARDCODE_LESSON === '1'
  let lesson: {
    id: string
    title: string
    description: string | null
    estimatedMinutes: number | null
  }

  if (useHardcodedLesson && lessonId === hardcodedLesson.id) {
    // Usar lección hardcodeada
    lesson = {
      id: hardcodedLesson.id,
      title: hardcodedLesson.lesson.title,
      description: hardcodedLesson.lesson.description,
      estimatedMinutes: hardcodedLesson.lesson.duration_minutes,
    }
  } else {
    // Buscar en base de datos
    const dbLesson = await prisma.lesson.findUnique({
      where: { id: lessonId, isPublished: true },
      select: { id: true, title: true, description: true, estimatedMinutes: true },
    })

    if (!dbLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    lesson = dbLesson
  }

  // 4. Check for active session
  let lessonSession = await prisma.lessonSession.findFirst({
    where: {
      userId: session.user.id,
      lessonId: lessonId,
      endedAt: null, // Active session
    },
  })

  // 5. If no active session, create one
  if (!lessonSession) {
    lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonId,
        sessionAttempt: 1, // TODO: Calculate properly in MVP-3
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
    })
  }

  // 6. Return session info (welcome message will be generated client-side)
  return NextResponse.json({
    sessionId: lessonSession.id,
    lesson: {
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes,
    },
  })
}
