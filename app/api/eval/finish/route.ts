import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { gradeTo20 } from '@/lib/assessment-utils'
import { isPassing } from '@/lib/rubric'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/eval/finish
 * Finalizes the assessment for the current guest participant.
 * Calculates the grade based on completed activities.
 */
export async function POST(request: Request) {
  const { participantId, sessionId } = await request.json()

  if (!participantId || !sessionId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify guest cookie matches participant
  const cookieStore = await cookies()
  const cookieParticipantId = cookieStore.get('guest_participant_id')?.value
  if (cookieParticipantId !== participantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const participant = await prisma.assessmentParticipant.findUnique({
    where: { id: participantId },
    include: {
      session: {
        include: {
          lesson: true,
          activities: { where: { status: 'COMPLETED' } },
        },
      },
    },
  })

  if (!participant || participant.sessionId !== sessionId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Already finished — return existing values
  if (participant.completedAt) {
    return NextResponse.json({
      grade: participant.grade ?? 0,
      gradeOver20: participant.gradeOver20 ?? 0,
      passed: participant.passed,
    })
  }

  const session = participant.session
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Calculate grade based only on EVALUATIVE activities completed
  const contentJson = session.lesson.contentJson as unknown as LessonContent
  const activityEvaluativeMap = new Map<string, boolean>()
  for (const a of contentJson.activities) {
    activityEvaluativeMap.set(a.id, a.verification?.is_evaluative !== false)
  }

  const evaluativeActivities = session.activities.filter(ap =>
    activityEvaluativeMap.get(ap.activityId) !== false
  )

  const comprehensionScores: Record<string, number> = {
    memorized: 40, understood: 70, applied: 85, analyzed: 100,
  }
  const attemptPenalty = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75]

  let totalScore = 0
  for (const ap of evaluativeActivities) {
    const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
    const lastAttempt = evidence?.attempts?.at(-1)
    const level = lastAttempt?.analysis?.understanding_level || 'memorized'
    const comprehension = comprehensionScores[level] || 40
    const efficiency = attemptPenalty[Math.min(ap.attempts - 1, 5)]
    const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
    const activityScore = (comprehension * 0.7) + (comprehension * 0.3 * efficiency * tangentPenalty)
    totalScore += activityScore
  }

  // If no evaluative activities completed, grade is 0
  const totalEvaluative = Array.from(activityEvaluativeMap.values()).filter(Boolean).length
  const grade = totalEvaluative > 0
    ? Math.round((totalScore / totalEvaluative)) // average over total expected, not just completed
    : 0
  const gradeOver20 = gradeTo20(grade)
  const passed = isPassing(grade)

  // Update participant
  await prisma.assessmentParticipant.update({
    where: { id: participantId },
    data: {
      grade,
      gradeOver20,
      passed,
      completedAt: new Date(),
    },
  })

  // Update lesson session
  await prisma.lessonSession.update({
    where: { id: sessionId },
    data: {
      grade,
      passed,
      completedAt: new Date(),
      progress: 100,
    },
  })

  return NextResponse.json({ grade, gradeOver20, passed })
}
