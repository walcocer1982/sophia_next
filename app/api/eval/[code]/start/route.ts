import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const COOKIE_MAX_AGE_SEC = 24 * 60 * 60 // 24 horas — cubre día de evento sin requerir DNI

/**
 * POST /api/eval/[code]/start
 *
 * Crea o RECUPERA la sesión de un visitante del kiosko. Recovery por 2 vías:
 *   1) Cookie `guest_user_id` activa con sesión no completada → recupera
 *   2) DNI provisto y participant ya existe en este assessment → recupera
 *
 * Si la sesión existe pero ya está completada, devuelve status='already_completed'
 * con la nota para que el cliente decida (mostrar resultado o empezar de nuevo).
 *
 * Si no hay nada para recuperar, crea User guest + LessonSession + Participant
 * desde cero como antes.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { firstName, lastName, dni, email, language } = await request.json() as {
    firstName?: string
    lastName?: string
    dni?: string
    email?: string
    language?: 'ES' | 'EN'
  }
  const lang: 'ES' | 'EN' = language === 'EN' ? 'EN' : 'ES'

  if (!firstName || !firstName.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const assessment = await prisma.assessment.findUnique({
    where: { code: code.toUpperCase() },
    include: { lesson: true },
  })

  if (!assessment || !assessment.isActive) {
    return NextResponse.json({ error: 'Evaluación no disponible' }, { status: 404 })
  }

  const cookieStore = await cookies()
  const dniTrimmed = dni?.trim().slice(0, 20) || null

  // ═══════════════════════════════════════════════════════════════
  // PATH 1 — Recovery por COOKIE (más rápido, no requiere DNI)
  // ═══════════════════════════════════════════════════════════════
  const existingUserId = cookieStore.get('guest_user_id')?.value
  if (existingUserId) {
    const existingSession = await prisma.lessonSession.findFirst({
      where: {
        userId: existingUserId,
        lessonId: assessment.lessonId,
        // Solo recupera si NO está completada — completadas van por path de "already"
      },
      include: { assessmentParticipant: true },
      orderBy: { startedAt: 'desc' },
    })

    if (existingSession?.assessmentParticipant?.assessmentId === assessment.id) {
      // Sesión completada → devolver status para que cliente muestre resultado
      if (existingSession.completedAt) {
        logger.info('eval.start.cookie_already_completed', {
          assessmentId: assessment.id,
          sessionId: existingSession.id,
        })
        return NextResponse.json({
          status: 'already_completed',
          participantId: existingSession.assessmentParticipant.id,
          sessionId: existingSession.id,
          grade: existingSession.assessmentParticipant.grade,
          gradeOver20: existingSession.assessmentParticipant.gradeOver20,
          passed: existingSession.assessmentParticipant.passed,
          participantName: [
            existingSession.assessmentParticipant.firstName,
            existingSession.assessmentParticipant.lastName,
          ].filter(Boolean).join(' '),
        })
      }
      // Sesión activa → recuperar
      logger.info('eval.start.recovered_by_cookie', {
        assessmentId: assessment.id,
        sessionId: existingSession.id,
      })
      // Refrescar cookies para extender la ventana
      cookieStore.set('guest_user_id', existingUserId, cookieOpts())
      cookieStore.set('guest_participant_id', existingSession.assessmentParticipant.id, cookieOpts())
      return NextResponse.json({
        status: 'recovered',
        participantId: existingSession.assessmentParticipant.id,
        sessionId: existingSession.id,
        timeLimitMin: assessment.timeLimitMin,
        language: existingSession.language,
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PATH 2 — Recovery por DNI (si lo proveyeron)
  // ═══════════════════════════════════════════════════════════════
  if (dniTrimmed) {
    const existingParticipant = await prisma.assessmentParticipant.findFirst({
      where: {
        assessmentId: assessment.id,
        dni: dniTrimmed,
      },
      include: {
        session: true,
      },
      orderBy: { startedAt: 'desc' }, // si hay duplicados legacy, tomar el más reciente
    })

    if (existingParticipant && existingParticipant.session) {
      // Sesión completada → devolver status
      if (existingParticipant.session.completedAt) {
        logger.info('eval.start.dni_already_completed', {
          assessmentId: assessment.id,
          participantId: existingParticipant.id,
        })
        return NextResponse.json({
          status: 'already_completed',
          participantId: existingParticipant.id,
          sessionId: existingParticipant.session.id,
          grade: existingParticipant.grade,
          gradeOver20: existingParticipant.gradeOver20,
          passed: existingParticipant.passed,
          participantName: [existingParticipant.firstName, existingParticipant.lastName]
            .filter(Boolean).join(' '),
        })
      }
      // Sesión activa por DNI → recuperar + setear cookies
      logger.info('eval.start.recovered_by_dni', {
        assessmentId: assessment.id,
        sessionId: existingParticipant.session.id,
      })
      cookieStore.set('guest_user_id', existingParticipant.session.userId, cookieOpts())
      cookieStore.set('guest_participant_id', existingParticipant.id, cookieOpts())
      return NextResponse.json({
        status: 'recovered',
        participantId: existingParticipant.id,
        sessionId: existingParticipant.session.id,
        timeLimitMin: assessment.timeLimitMin,
        language: existingParticipant.session.language,
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PATH 3 — Crear desde cero (visitante nuevo o sin recovery posible)
  // ═══════════════════════════════════════════════════════════════
  const guestEmail = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@assessment.local`
  const trimmedLast = lastName?.trim() || ''
  const fullName = (
    trimmedLast ? `${firstName.trim()} ${trimmedLast}` : firstName.trim()
  ).slice(0, 100)

  const guestUser = await prisma.user.create({
    data: {
      email: guestEmail,
      name: fullName,
      role: 'STUDENT',
    },
  })

  const lessonSession = await prisma.lessonSession.create({
    data: {
      userId: guestUser.id,
      lessonId: assessment.lessonId,
      isTest: false,
      language: lang,
    },
  })

  const participant = await prisma.assessmentParticipant.create({
    data: {
      assessmentId: assessment.id,
      firstName: firstName.trim().slice(0, 80),
      lastName: trimmedLast ? trimmedLast.slice(0, 80) : null,
      dni: dniTrimmed,
      email: email?.trim().slice(0, 100) || null,
      sessionId: lessonSession.id,
      language: lang,
    },
  })

  cookieStore.set('guest_user_id', guestUser.id, cookieOpts())
  cookieStore.set('guest_participant_id', participant.id, cookieOpts())

  return NextResponse.json({
    status: 'created',
    participantId: participant.id,
    sessionId: lessonSession.id,
    timeLimitMin: assessment.timeLimitMin,
  })
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE_SEC,
    path: '/',
  }
}
