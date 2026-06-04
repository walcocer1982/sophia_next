import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { surveySubmitSchema } from '@/lib/validators/survey'
import { logger } from '@/lib/logger'
import { getAuthOrGuest } from '@/lib/auth-or-guest'

export const runtime = 'nodejs'

/**
 * POST /api/survey/submit
 * Guarda la encuesta NPS post-lección. Requisitos:
 *  - Usuario autenticado y dueño de la sesión
 *  - La sesión existe
 *  - No existe encuesta previa para esa sesión (1 encuesta por sesión, ver
 *    @@unique en LessonSurvey.sessionId)
 *
 * Si la sesión NO está completada (completedAt null) igualmente se acepta —
 * el estudiante puede contestar sin terminar todas las actividades. La UI
 * normalmente solo la dispara post-cierre, pero el backend no lo fuerza para
 * dar flexibilidad a futuro (ej. encuesta de abandono).
 */
export async function POST(request: Request) {
  // Auth-or-guest: el survey puede venir de un estudiante Google (/learn) o
  // de un visitante del kiosko (/eval, sin cuenta Google pero con cookie guest).
  const authResult = await getAuthOrGuest()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = surveySubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { sessionId, npsScore, npsReason, utility, language } = parsed.data

  // Verificar que la sesión existe y pertenece al usuario (auth o guest)
  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: authResult.userId },
    select: { id: true, language: true, survey: { select: { id: true } } },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (lessonSession.survey) {
    return NextResponse.json(
      { error: 'Survey already submitted for this session' },
      { status: 409 }
    )
  }

  try {
    const survey = await prisma.lessonSurvey.create({
      data: {
        sessionId,
        npsScore,
        npsReason: npsReason?.trim() || null,
        utility,
        // Si el cliente envió language, usar ese; si no, heredar de la sesión.
        language: language || lessonSession.language,
      },
      select: {
        id: true,
        npsScore: true,
        utility: true,
        language: true,
        submittedAt: true,
      },
    })

    logger.info('survey.submitted', {
      sessionId,
      userId: authResult.userId,
      isGuest: authResult.isGuest,
      npsScore,
      utility,
      language: survey.language,
      hasReason: !!npsReason,
    })

    return NextResponse.json({ success: true, survey })
  } catch (err: unknown) {
    logger.error('survey.submit_error', {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'No se pudo guardar la encuesta' },
      { status: 500 }
    )
  }
}
