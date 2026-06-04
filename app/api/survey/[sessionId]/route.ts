import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getAuthOrGuest } from '@/lib/auth-or-guest'

export const runtime = 'nodejs'

/**
 * GET /api/survey/[sessionId]
 * Devuelve si la sesión ya tiene encuesta NPS contestada. Soporta tanto
 * usuarios autenticados con Google (/learn) como visitantes del kiosko
 * (cookie guest_user_id desde /eval).
 *
 * Response:
 *   { submitted: false }                              — aún no respondida
 *   { submitted: true, survey: { npsScore, ... } }    — ya respondida
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authResult = await getAuthOrGuest()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: authResult.userId },
    select: {
      id: true,
      completedAt: true,
      language: true,
      survey: {
        select: {
          npsScore: true,
          npsReason: true,
          utility: true,
          language: true,
          submittedAt: true,
        },
      },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    submitted: !!lessonSession.survey,
    completedAt: lessonSession.completedAt,
    sessionLanguage: lessonSession.language,
    survey: lessonSession.survey ?? null,
  })
}
