import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * POST /api/eval/[code]/start
 * Public endpoint - creates a guest user, a LessonSession, and an AssessmentParticipant.
 * Returns sessionId so client can use the chat interface.
 *
 * Sets a cookie to identify this guest in subsequent calls (no Google OAuth).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { firstName, lastName, dni, email } = await request.json()

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Nombre y apellido son requeridos' }, { status: 400 })
  }

  const assessment = await prisma.assessment.findUnique({
    where: { code: code.toUpperCase() },
    include: { lesson: true },
  })

  if (!assessment || !assessment.isActive) {
    return NextResponse.json({ error: 'Evaluación no disponible' }, { status: 404 })
  }

  // Create a temporary guest user
  // Email format ensures uniqueness even with duplicate names
  const guestEmail = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@assessment.local`
  const fullName = `${firstName.trim()} ${lastName.trim()}`.slice(0, 100)

  const guestUser = await prisma.user.create({
    data: {
      email: guestEmail,
      name: fullName,
      role: 'STUDENT',
    },
  })

  // Create the lesson session
  const lessonSession = await prisma.lessonSession.create({
    data: {
      userId: guestUser.id,
      lessonId: assessment.lessonId,
      isTest: false,
    },
  })

  // Create the participant record linking everything
  const participant = await prisma.assessmentParticipant.create({
    data: {
      assessmentId: assessment.id,
      firstName: firstName.trim().slice(0, 80),
      lastName: lastName.trim().slice(0, 80),
      dni: dni?.trim().slice(0, 20) || null,
      email: email?.trim().slice(0, 100) || null,
      sessionId: lessonSession.id,
    },
  })

  // Set cookie so subsequent /api/chat/* calls know this user
  const cookieStore = await cookies()
  cookieStore.set('guest_user_id', guestUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4, // 4 hours
    path: '/',
  })
  cookieStore.set('guest_participant_id', participant.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  })

  return NextResponse.json({
    participantId: participant.id,
    sessionId: lessonSession.id,
    timeLimitMin: assessment.timeLimitMin,
  })
}
