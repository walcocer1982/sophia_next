import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { gradeTo20 } from '@/lib/assessment-utils'
import { isPassing } from '@/lib/rubric'
import { verifyActivityCompletion } from '@/lib/activity-verification'
import { calculateGrade, calculateCompletionGrade } from '@/lib/grading'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'
export const maxDuration = 60

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
          lesson: { include: { course: { select: { methodology: true } } } },
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

  const contentJson = session.lesson.contentJson as unknown as LessonContent

  // Get all messages from this session for post-hoc evaluation
  const messages = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { timestamp: 'asc' },
    select: { role: true, content: true },
  })

  // POST-HOC EVALUATION: For each evaluative activity in the lesson,
  // analyze the user's messages to determine if the activity was completed.
  // This is necessary because voice mode doesn't go through chat/stream's
  // automatic verification logic.
  const userMessages = messages.filter(m => m.role === 'user')
  const conversationHistory = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Combine all user responses into one string per activity attempt
  const allUserText = userMessages.map(m => m.content).join('\n')

  for (const activity of contentJson.activities) {
    if (activity.verification?.is_evaluative === false) continue

    // Skip if already has progress (text mode already evaluated)
    const existingProgress = session.activities.find(a => a.activityId === activity.id)
    if (existingProgress?.status === 'COMPLETED') continue

    if (allUserText.length < 5) continue // No real input

    try {
      const result = await verifyActivityCompletion(
        allUserText,
        activity,
        conversationHistory
      )

      // Save as ActivityProgress
      await prisma.activityProgress.upsert({
        where: {
          lessonSessionId_activityId: {
            lessonSessionId: session.id,
            activityId: activity.id,
          },
        },
        create: {
          lessonSessionId: session.id,
          activityId: activity.id,
          status: 'COMPLETED',
          attempts: 1,
          completedAt: new Date(),
          passedCriteria: result.completed,
          aiFeedback: result.feedback || null,
          evidenceData: {
            attempts: [{
              studentResponse: allUserText.slice(0, 1000),
              analysis: {
                ready_to_advance: result.ready_to_advance,
                completed: result.completed,
                criteriaMatched: result.criteriaMatched,
                criteriaMissing: result.criteriaMissing,
                understanding_level: result.understanding_level,
                response_type: result.response_type,
                completeness_percentage: result.completeness_percentage,
              },
              timestamp: new Date().toISOString(),
            }],
          },
        },
        update: {
          status: 'COMPLETED',
          completedAt: new Date(),
          passedCriteria: result.completed,
          aiFeedback: result.feedback || null,
          evidenceData: {
            attempts: [{
              studentResponse: allUserText.slice(0, 1000),
              analysis: {
                ready_to_advance: result.ready_to_advance,
                completed: result.completed,
                criteriaMatched: result.criteriaMatched,
                criteriaMissing: result.criteriaMissing,
                understanding_level: result.understanding_level,
                response_type: result.response_type,
                completeness_percentage: result.completeness_percentage,
              },
              timestamp: new Date().toISOString(),
            }],
          },
        },
      })
    } catch (e) {
      console.error('Post-hoc verification error for activity', activity.id, e)
    }
  }

  // Re-fetch session activities after post-hoc evaluation
  const updatedActivities = await prisma.activityProgress.findMany({
    where: { lessonSessionId: session.id, status: 'COMPLETED' },
  })

  // Calculate grade based only on EVALUATIVE activities completed.
  // Para el promedio ponderado: cada actividad lleva su `type` y `weight`
  // declarados en el contentJson de la lesson. Si una actividad no tiene
  // `weight` explícito, getActivityWeight() asigna el default por tipo
  // (explanation=1, reflection=2, practice=3, closing=4).
  const activityMetaMap = new Map<string, {
    isEvaluative: boolean
    activityType?: 'explanation' | 'practice' | 'reflection' | 'closing'
    weight?: number
  }>()
  for (const a of contentJson.activities) {
    activityMetaMap.set(a.id, {
      isEvaluative: a.verification?.is_evaluative !== false,
      activityType: a.type,
      weight: typeof a.weight === 'number' ? a.weight : undefined,
    })
  }

  // Enriquecer cada ActivityProgress con su type/weight del contentJson para
  // que calculateGrade pueda hacer el promedio ponderado.
  const evaluativeActivities = updatedActivities
    .filter((ap) => activityMetaMap.get(ap.activityId)?.isEvaluative !== false)
    .map((ap) => {
      const meta = activityMetaMap.get(ap.activityId)
      return {
        ...ap,
        activityType: meta?.activityType,
        weight: meta?.weight,
      }
    })

  // Denominator = suma de pesos ESPERADOS de todas las actividades evaluativas
  // de la lesson (no solo las completadas). Penaliza sesiones incompletas.
  const totalWeightExpected = contentJson.activities
    .filter((a) => a.verification?.is_evaluative !== false)
    .reduce((sum, a) => {
      const explicit = typeof a.weight === 'number' ? a.weight : null
      if (explicit !== null) return sum + explicit
      // Default por tipo
      const w = a.type === 'closing' ? 4
        : a.type === 'practice' ? 3
        : a.type === 'reflection' ? 2
        : 1
      return sum + w
    }, 0)

  // Para CODE (binario) seguimos usando cuenta simple; para REFLECTIVE el
  // grade es ponderado. Shared formula — ver lib/grading.ts.
  const totalEvaluativeCount = Array.from(activityMetaMap.values())
    .filter((m) => m.isEvaluative).length
  const grade = session.lesson.course?.methodology === 'CODE'
    ? calculateCompletionGrade(evaluativeActivities.length, totalEvaluativeCount)
    : calculateGrade(evaluativeActivities, totalWeightExpected)
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
