import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getNextActivity, getTotalActivities } from '@/lib/lesson-parser'
import { verifyActivityCompletion, verifyStepCompletion } from '@/lib/activity-verification'
import { detectHallucination } from '@/lib/hallucination-detector'
import { calculateGrade, calculateCompletionGrade } from '@/lib/grading'
import { isPassing } from '@/lib/rubric'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/voice/message
 * Saves a voice transcript as a message in the chat history.
 *
 * Cuando role='user', ADEMÁS dispara el mismo flujo de evaluación que
 * /api/chat/stream:
 *   - filtro de hallucinations (Whisper transcribiendo ruido)
 *   - verifyActivityCompletion contra la actividad actual
 *   - upsert ActivityProgress (completed | attempts++)
 *   - transición de actividad si ready_to_advance
 *   - cierre de sesión + grade si es la última actividad
 *
 * Sin esto, las sesiones por voz acumulan mensajes pero quedan en
 * "Sin evaluar" / 0% progreso para siempre — la voz era un cerebro
 * paralelo (gpt-realtime) sin conexión al sistema de evaluación.
 */
export async function POST(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, role, content } = await request.json()

  if (!sessionId || !role || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Verify session belongs to user + cargar lo necesario para evaluar
  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: session.userId },
    include: {
      lesson: { include: { course: { select: { methodology: true } } } },
      activities: true,
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 1) Guardar el mensaje
  const message = await prisma.message.create({
    data: { sessionId, role, content },
  })

  // 2) Solo cuando es del estudiante, disparar evaluación
  if (role !== 'user') {
    return NextResponse.json({ id: message.id })
  }

  // Filtro de hallucinations: si Whisper transcribió ruido, no evaluar
  // (saveMessage en el cliente ya filtra los casos obvios; esto es defensa
  // en profundidad para los más sutiles).
  const hallucinationCheck = detectHallucination(content)
  if (hallucinationCheck.isHallucination) {
    console.warn('[voice/message] hallucination skipped:', hallucinationCheck.reason, content.slice(0, 80))
    return NextResponse.json({ id: message.id, skipped: 'hallucination' })
  }

  // Determinar actividad actual: usar la que tracking en LessonSession.activityId,
  // o la primera no-completada como fallback.
  const contentJson = lessonSession.lesson.contentJson as unknown as LessonContent
  const completedIds = new Set(
    lessonSession.activities.filter(a => a.status === 'COMPLETED').map(a => a.activityId),
  )
  const currentActivity =
    contentJson.activities.find(a => a.id === lessonSession.activityId) ||
    contentJson.activities.find(a => !completedIds.has(a.id)) ||
    contentJson.activities[0]

  if (!currentActivity) {
    return NextResponse.json({ id: message.id, skipped: 'no-activity' })
  }

  // Cargar progreso e historial
  const activityProgress = await prisma.activityProgress.findUnique({
    where: {
      lessonSessionId_activityId: {
        lessonSessionId: lessonSession.id,
        activityId: currentActivity.id,
      },
    },
    select: { attempts: true, evidenceData: true, status: true },
  })
  if (activityProgress?.status === 'COMPLETED') {
    return NextResponse.json({ id: message.id, skipped: 'already-completed' })
  }

  const attempts = activityProgress?.attempts || 0
  const existingEvidence = (activityProgress?.evidenceData as {
    attempts?: Array<unknown>
    scaffoldingTurns?: number
  } | null) || { attempts: [] }
  const scaffoldingTurns = existingEvidence.scaffoldingTurns || 0

  // Mismo cap por tipo que chat/stream
  const SCAFFOLDING_CAP_BY_TYPE: Record<string, number> = {
    explanation: 3,
    practice: 3,
    reflection: 1,
    closing: 3,
  }
  const scaffoldingCap = SCAFFOLDING_CAP_BY_TYPE[currentActivity.type as string] ?? 3

  // Historial de la conversación para verificación acumulativa
  const allMessages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    select: { role: true, content: true },
  })
  const conversationHistory = allMessages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Verificar (CODE = binario, resto = socrático)
  const verification = lessonSession.lesson.course?.methodology === 'CODE'
    ? await verifyStepCompletion(content, currentActivity, conversationHistory)
    : await verifyActivityCompletion(content, currentActivity, conversationHistory)

  // Aplicar cap de scaffolding
  let willScaffold = false
  if (verification.needs_scaffolding === true && verification.next_subquestion) {
    if (scaffoldingTurns < scaffoldingCap) {
      willScaffold = true
    } else {
      verification.needs_scaffolding = false
      verification.ready_to_advance = true
    }
  }

  // Persistir
  const attemptRecord = {
    studentResponse: content,
    analysis: {
      ready_to_advance: verification.ready_to_advance,
      completed: verification.completed,
      criteriaMatched: verification.criteriaMatched,
      criteriaMissing: verification.criteriaMissing,
      understanding_level: verification.understanding_level,
      response_type: verification.response_type,
      completeness_percentage: verification.completeness_percentage,
    },
    timestamp: new Date().toISOString(),
  }
  const newEvidence = JSON.parse(JSON.stringify({
    attempts: [...(existingEvidence.attempts || []), attemptRecord],
    scaffoldingTurns: willScaffold ? scaffoldingTurns + 1 : scaffoldingTurns,
  }))

  if (verification.ready_to_advance) {
    await prisma.activityProgress.upsert({
      where: {
        lessonSessionId_activityId: {
          lessonSessionId: lessonSession.id,
          activityId: currentActivity.id,
        },
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        passedCriteria: true,
        aiFeedback: verification.feedback,
        attempts: attempts + 1,
        evidenceData: newEvidence,
      },
      create: {
        lessonSessionId: lessonSession.id,
        activityId: currentActivity.id,
        status: 'COMPLETED',
        completedAt: new Date(),
        passedCriteria: true,
        aiFeedback: verification.feedback,
        attempts: attempts + 1,
        evidenceData: newEvidence,
      },
    })

    // Transición a próxima actividad o cierre de lección
    const nextActivityRef = getNextActivity(contentJson, currentActivity.id)
    const totalActivities = getTotalActivities(contentJson)
    const completedCount = await prisma.activityProgress.count({
      where: { lessonSessionId: lessonSession.id, status: 'COMPLETED' },
    })

    if (nextActivityRef) {
      await prisma.lessonSession.update({
        where: { id: lessonSession.id },
        data: { activityId: nextActivityRef.activityId },
      })
    } else if (completedCount >= totalActivities) {
      // Última actividad: calcular grade y cerrar sesión
      const allActivities = await prisma.activityProgress.findMany({
        where: { lessonSessionId: lessonSession.id, status: 'COMPLETED' },
        select: { attempts: true, tangentCount: true, evidenceData: true },
      })
      const grade = lessonSession.lesson.course?.methodology === 'CODE'
        ? calculateCompletionGrade(completedCount, totalActivities)
        : calculateGrade(allActivities)
      await prisma.lessonSession.update({
        where: { id: lessonSession.id },
        data: {
          completedAt: new Date(),
          passed: isPassing(grade),
          progress: 100,
          grade,
        },
      })
    }

    return NextResponse.json({
      id: message.id,
      verified: true,
      ready_to_advance: true,
      level: verification.understanding_level,
    })
  }

  // No completado: solo incrementar attempts + scaffoldingTurns
  await prisma.activityProgress.upsert({
    where: {
      lessonSessionId_activityId: {
        lessonSessionId: lessonSession.id,
        activityId: currentActivity.id,
      },
    },
    update: {
      attempts: attempts + 1,
      evidenceData: newEvidence,
    },
    create: {
      lessonSessionId: lessonSession.id,
      activityId: currentActivity.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      attempts: attempts + 1,
      evidenceData: newEvidence,
    },
  })

  return NextResponse.json({
    id: message.id,
    verified: true,
    ready_to_advance: false,
    level: verification.understanding_level,
    needs_scaffolding: willScaffold,
  })
}
