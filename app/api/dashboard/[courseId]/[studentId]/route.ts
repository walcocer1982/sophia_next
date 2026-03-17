import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
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
            criteriaMatched?: string[]
            criteriaMissing?: string[]
          }
          studentResponse?: string
        }>
      } | null

      const lastAttempt = evidence?.attempts?.at(-1)

      // Calculate score for this activity
      const comprehensionScores: Record<string, number> = {
        memorized: 40, understood: 70, applied: 85, analyzed: 100,
      }
      const attemptPenalty = [1.0, 0.85, 0.7, 0.6]
      const level = lastAttempt?.analysis?.understanding_level || 'memorized'
      const base = comprehensionScores[level] || 40
      const penalty = attemptPenalty[Math.min((progress?.attempts || 1) - 1, 3)]
      const tangentPenalty = (progress?.tangentCount || 0) > 3 ? 0.9 : 1.0
      const score = progress?.status === 'COMPLETED' ? Math.round(base * penalty * tangentPenalty) : null

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
        score,
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

  // Understanding level distribution across all completed activities
  const allLevels: Record<string, number> = { memorized: 0, understood: 0, applied: 0, analyzed: 0 }
  for (const lesson of lessonDetails) {
    for (const act of lesson.activities) {
      if (act.understandingLevel && allLevels[act.understandingLevel] !== undefined) {
        allLevels[act.understandingLevel]++
      }
    }
  }

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
      comprehension: allLevels,
      gradeTrend,
    },
    lessons: lessonDetails,
  })
}
