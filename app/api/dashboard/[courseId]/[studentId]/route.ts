import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { calculateRubricLevel, calculateOverallRubric, type RubricLevel } from '@/lib/rubric'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; studentId: string }> }
) {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const { courseId, studentId } = await params

  // Get student info
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, image: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Get course info
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Get all student sessions for this course's lessons
  const lessons = await prisma.lesson.findMany({
    where: { courseId, isPublished: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      contentJson: true,
      sessions: {
        where: { userId: studentId, isTest: false },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          passed: true,
          grade: true,
          progress: true,
          sessionAttempt: true,
          summaryText: true,
          activityId: true,
          lastActivityAt: true,
          activities: {
            orderBy: { completedAt: 'asc' },
            select: {
              activityId: true,
              status: true,
              attempts: true,
              tangentCount: true,
              completedAt: true,
              evidenceData: true,
              aiFeedback: true,
              passedCriteria: true,
            },
          },
          messages: {
            select: { id: true },
          },
        },
      },
    },
  })

  // Build lesson details with activity breakdown
  const lessonDetails = lessons.map(lesson => {
    const content = lesson.contentJson as LessonContent | null
    const activityDefs = content?.activities || []
    const latestSession = lesson.sessions[0] || null
    const duration = latestSession?.completedAt
      ? Math.round((new Date(latestSession.completedAt).getTime() - new Date(latestSession.startedAt).getTime()) / 1000 / 60)
      : null

    // Build activity breakdown
    const activities = activityDefs.map((actDef, idx) => {
      const progress = latestSession?.activities.find(a => a.activityId === actDef.id)
      const evidence = progress?.evidenceData as {
        attempts?: Array<{
          analysis?: {
            understanding_level?: string
            response_type?: string
            completeness_percentage?: number
            criteriaMatched?: string[]
            criteriaMissing?: string[]
          }
          studentResponse?: string
        }>
      } | null

      const lastAttempt = evidence?.attempts?.at(-1)

      // Calculate rubric level for this activity
      const level = lastAttempt?.analysis?.understanding_level || 'memorized'
      const completeness = lastAttempt?.analysis?.completeness_percentage || 0
      const passedCriteria = progress?.passedCriteria !== false // default true for old data

      // Find best attempt completeness for rubric calculation
      const bestCompleteness = evidence?.attempts
        ? Math.max(...evidence.attempts.map(a => (a.analysis as { completeness_percentage?: number })?.completeness_percentage || 0))
        : completeness

      const responseType = lastAttempt?.analysis?.response_type
      const rubricLevel = progress?.status === 'COMPLETED'
        ? calculateRubricLevel(level, bestCompleteness, progress.attempts, passedCriteria, responseType)
        : null

      return {
        id: actDef.id,
        index: idx + 1,
        title: actDef.teaching?.agent_instruction?.slice(0, 100) || `Actividad ${idx + 1}`,
        status: progress?.status || 'NOT_STARTED',
        attempts: progress?.attempts || 0,
        tangentCount: progress?.tangentCount || 0,
        understandingLevel: lastAttempt?.analysis?.understanding_level || null,
        responseType: lastAttempt?.analysis?.response_type || null,
        criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
        criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
        rubricLevel,
        passedCriteria,
        completedAt: progress?.completedAt,
      }
    })

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      sessionId: latestSession?.id || null,
      startedAt: latestSession?.startedAt || null,
      completedAt: latestSession?.completedAt || null,
      grade: latestSession?.grade || null,
      passed: latestSession?.passed || false,
      attempt: latestSession?.sessionAttempt || 0,
      duration,
      totalMessages: latestSession?.messages.length || 0,
      summaryText: latestSession?.summaryText || null,
      currentActivityId: latestSession?.activityId || null,
      activities,
    }
  })

  // Global stats
  const completedLessons = lessonDetails.filter(l => l.completedAt).length
  const grades = lessonDetails.filter(l => l.grade !== null).map(l => l.grade as number)
  const avgGrade = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null
  const totalMessages = lessonDetails.reduce((a, l) => a + l.totalMessages, 0)

  // Rubric level distribution across all completed activities
  const rubricDistribution: Record<string, number> = {
    logrado_destacado: 0, logrado: 0, en_proceso: 0, en_inicio: 0,
  }
  const allRubricLevels: RubricLevel[] = []
  for (const lesson of lessonDetails) {
    for (const act of lesson.activities) {
      if (act.rubricLevel) {
        rubricDistribution[act.rubricLevel]++
        allRubricLevels.push(act.rubricLevel)
      }
    }
  }

  // Overall rubric level
  const overallRubric = calculateOverallRubric(allRubricLevels)

  // Grade trend (per lesson, in order)
  const gradeTrend = lessonDetails
    .filter(l => l.grade !== null)
    .map(l => ({ lesson: l.lessonTitle, grade: l.grade as number }))

  return NextResponse.json({
    student,
    course,
    stats: {
      completedLessons,
      totalLessons: lessonDetails.length,
      avgGrade,
      totalMessages,
      overallRubric,
      rubricDistribution,
      gradeTrend,
    },
    lessons: lessonDetails,
  })
}
