import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { checkAndGeneratePartialReports } from '@/lib/lesson-report'
import { calculateRubricLevel, calculateOverallRubric, type RubricLevel } from '@/lib/rubric'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

// Calculate partial grade from completed activities (same formula as chat/stream)
function calculatePartialGrade(activities: Array<{
  status: string
  attempts: number
  tangentCount: number
  evidenceData: unknown
}>): number | null {
  const completed = activities.filter(a => a.status === 'COMPLETED')
  if (completed.length === 0) return null

  const comprehensionScores: Record<string, number> = {
    memorized: 40, understood: 70, applied: 85, analyzed: 100,
  }
  const attemptPenalty = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75]

  let totalScore = 0
  for (const ap of completed) {
    const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
    const lastAttempt = evidence?.attempts?.at(-1)
    const level = lastAttempt?.analysis?.understanding_level || 'memorized'
    const comprehension = comprehensionScores[level] || 40
    const efficiency = attemptPenalty[Math.min(ap.attempts - 1, 5)]
    const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
    totalScore += (comprehension * 0.7) + (comprehension * 0.3 * efficiency * tangentPenalty)
  }

  return Math.round(totalScore / completed.length)
}

// Calculate rubric levels from session activities
function calculateSessionRubric(activities: Array<{
  status: string
  attempts: number
  evidenceData: unknown
  passedCriteria?: boolean | null
}>): { lastActivityLevel: RubricLevel | null; overallLevel: RubricLevel | null } {
  const completed = activities.filter(a => a.status === 'COMPLETED')
  if (completed.length === 0) return { lastActivityLevel: null, overallLevel: null }

  const levels: RubricLevel[] = completed.map(ap => {
    const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string; completeness_percentage?: number; response_type?: string } }> } | null
    const bestCompleteness = evidence?.attempts
      ? Math.max(...evidence.attempts.map(a => a.analysis?.completeness_percentage || 0))
      : 0
    const lastAttempt = evidence?.attempts?.at(-1)
    const level = lastAttempt?.analysis?.understanding_level || 'memorized'
    const responseType = lastAttempt?.analysis?.response_type
    const passed = ap.passedCriteria !== false
    return calculateRubricLevel(level, bestCompleteness, ap.attempts, passed, responseType)
  })

  const lastActivityLevel = levels.at(-1) || null
  const overallLevel = calculateOverallRubric(levels)
  return { lastActivityLevel, overallLevel }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const { courseId } = await params
  const { searchParams } = new URL(request.url)
  const filterSectionId = searchParams.get('sectionId')

  // Check if user is lead/superadmin or section instructor
  const isLead = result.user.role === 'SUPERADMIN' || await prisma.course.findFirst({
    where: { id: courseId, userId: result.user.id },
  })

  // Get section instructor's section IDs for filtering
  let allowedStudentIds: Set<string> | null = null
  if (!isLead) {
    const mySections = await prisma.sectionInstructor.findMany({
      where: { userId: result.user.id, section: { courseId } },
      select: { sectionId: true },
    })
    if (mySections.length === 0) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const sectionIds = filterSectionId
      ? [filterSectionId]
      : mySections.map(s => s.sectionId)
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { userId: true },
    })
    allowedStudentIds = new Set(enrollments.map(e => e.userId))
  } else if (filterSectionId) {
    // Lead/SUPERADMIN with section filter
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: filterSectionId },
      select: { userId: true },
    })
    allowedStudentIds = new Set(enrollments.map(e => e.userId))
  }

  // Get course with all published lessons and their sessions
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      career: { select: { id: true, name: true } },
      user: { select: { name: true } },
      lessons: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          contentJson: true,
          availableAt: true,
          closesAfterHours: true,
          sessions: {
            where: { isTest: false },
            select: {
              id: true,
              userId: true,
              completedAt: true,
              passed: true,
              grade: true,
              startedAt: true,
              lastActivityAt: true,
              activityId: true,
              progress: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              activities: {
                select: {
                  activityId: true,
                  status: true,
                  attempts: true,
                  tangentCount: true,
                  completedAt: true,
                  evidenceData: true,
                  passedCriteria: true,
                },
              },
              _count: {
                select: {
                  messages: { where: { role: 'user' } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // === REAL-TIME MONITORING ===
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const now = new Date()
  const allSessionsRaw = course.lessons.flatMap(l => {
    const closesAt = l.availableAt
      ? new Date(new Date(l.availableAt).getTime() + l.closesAfterHours * 60 * 60 * 1000)
      : null
    const isClosed = closesAt ? now > closesAt : false
    return l.sessions.map(s => ({ ...s, lessonClosesAt: closesAt, lessonIsClosed: isClosed }))
  })

  // Filter by section if applicable
  const allSessions = allowedStudentIds
    ? allSessionsRaw.filter(s => allowedStudentIds!.has(s.user.id))
    : allSessionsRaw

  // Build activity metadata from contentJson (for all lessons)
  const activityMeta: Record<string, { title: string; lessonTitle: string; index: number; total: number }> = {}
  for (const lesson of course.lessons) {
    const content = lesson.contentJson as LessonContent | null
    if (!content?.activities) continue
    content.activities.forEach((act, idx) => {
      activityMeta[act.id] = {
        title: act.teaching?.agent_instruction?.slice(0, 80) || `Actividad ${idx + 1}`,
        lessonTitle: lesson.title,
        index: idx + 1,
        total: content.activities.length,
      }
    })
  }

  // Active students (session not completed, activity in last 2h)
  const activeStudents = allSessions
    .filter(s => !s.completedAt && s.lastActivityAt > twoHoursAgo)
    .map(s => {
      const meta = s.activityId ? activityMeta[s.activityId] : null
      const currentActivityProgress = s.activities.find(a => a.activityId === s.activityId)
      const lastEvidence = currentActivityProgress?.evidenceData as {
        attempts?: Array<{ analysis?: { criteriaMatched?: string[]; criteriaMissing?: string[] } }>
      } | null
      const lastAttempt = lastEvidence?.attempts?.at(-1)

      // Calculate active time in minutes
      const activeMinutes = Math.round((s.lastActivityAt.getTime() - s.startedAt.getTime()) / 1000 / 60)

      return {
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        image: s.user.image,
        sessionId: s.id,
        activityIndex: meta?.index || null,
        activityTotal: meta?.total || null,
        activityTitle: meta?.title || null,
        lessonTitle: meta?.lessonTitle || null,
        attempts: currentActivityProgress?.attempts || 0,
        percentage: s.progress || 0,
        criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
        criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        activeMinutes,
        messageCount: s._count.messages,
        grade: s.grade ?? calculatePartialGrade(s.activities),
        ...calculateSessionRubric(s.activities),
      }
    })

  // Inactive students (started but no activity in 2h+ and not completed)
  const inactiveStudents = allSessions
    .filter(s => !s.completedAt && s.lastActivityAt <= twoHoursAgo)
    .map(s => {
      const meta = s.activityId ? activityMeta[s.activityId] : null
      const currentActivityProgress = s.activities.find(a => a.activityId === s.activityId)
      const activeMinutes = Math.round((s.lastActivityAt.getTime() - s.startedAt.getTime()) / 1000 / 60)

      return {
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        image: s.user.image,
        sessionId: s.id,
        activityIndex: meta?.index || null,
        activityTotal: meta?.total || null,
        activityTitle: meta?.title || null,
        lessonTitle: meta?.lessonTitle || null,
        attempts: currentActivityProgress?.attempts || 0,
        percentage: s.progress || 0,
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        activeMinutes,
        messageCount: s._count.messages,
        grade: s.grade ?? calculatePartialGrade(s.activities),
        ...calculateSessionRubric(s.activities),
        hoursInactive: Math.round((Date.now() - s.lastActivityAt.getTime()) / 1000 / 60 / 60),
      }
    })

  // Completed students (session completed)
  const completedStudents = allSessions
    .filter(s => !!s.completedAt)
    .map(s => {
      const activeMinutes = Math.round((s.lastActivityAt.getTime() - s.startedAt.getTime()) / 1000 / 60)
      // Find which lesson this session belongs to
      const sessionLesson = course.lessons.find(l => l.sessions.some(ls => ls.id === s.id))

      return {
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        image: s.user.image,
        sessionId: s.id,
        activityIndex: null,
        activityTotal: null,
        activityTitle: null,
        lessonTitle: sessionLesson?.title || null,
        attempts: 0,
        percentage: 100,
        criteriaMatched: [] as string[],
        criteriaMissing: [] as string[],
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        activeMinutes,
        messageCount: s._count.messages,
        grade: s.grade ?? calculatePartialGrade(s.activities),
        ...calculateSessionRubric(s.activities),
        completedAt: s.completedAt,
      }
    })

  // === ACTIVITY FUNNEL (per lesson) ===
  const lessonFunnels = course.lessons.map(lesson => {
    const content = lesson.contentJson as LessonContent | null
    const activities = content?.activities || []
    const lessonSessions = lesson.sessions
    const totalStudents = new Set(lessonSessions.map(s => s.userId)).size

    const funnel = activities.map((act, idx) => {
      // Count completions across all sessions for this activity
      const completions = lessonSessions.filter(s =>
        s.activities.some(a => a.activityId === act.id && a.status === 'COMPLETED')
      )

      // Collect attempts and understanding levels
      const allAttempts = lessonSessions
        .map(s => s.activities.find(a => a.activityId === act.id))
        .filter(Boolean) as typeof lessonSessions[0]['activities']

      const attemptCounts = allAttempts.map(a => a.attempts)
      const avgAttempts = attemptCounts.length > 0
        ? +(attemptCounts.reduce((a, b) => a + b, 0) / attemptCounts.length).toFixed(1)
        : 0

      // Understanding level distribution
      const levels: Record<string, number> = { memorized: 0, understood: 0, applied: 0, analyzed: 0 }
      for (const ap of allAttempts) {
        const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
        const lastAttempt = evidence?.attempts?.at(-1)
        const level = lastAttempt?.analysis?.understanding_level || 'memorized'
        if (levels[level] !== undefined) levels[level]++
      }

      // Most failed criterion
      const allMissing: string[] = []
      for (const ap of allAttempts) {
        const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { criteriaMissing?: string[] } }> } | null
        for (const attempt of evidence?.attempts || []) {
          for (const criterion of attempt.analysis?.criteriaMissing || []) {
            allMissing.push(criterion)
          }
        }
      }
      const criteriaFrequency: Record<string, number> = {}
      for (const c of allMissing) {
        criteriaFrequency[c] = (criteriaFrequency[c] || 0) + 1
      }
      const mostFailedCriterion = Object.entries(criteriaFrequency)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null

      return {
        id: act.id,
        index: idx + 1,
        title: act.teaching?.agent_instruction?.slice(0, 80) || `Actividad ${idx + 1}`,
        completed: completions.length,
        total: totalStudents,
        percentage: totalStudents > 0 ? Math.round((completions.length / totalStudents) * 100) : 0,
        avgAttempts,
        comprehension: levels,
        mostFailedCriterion,
      }
    })

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalStudents,
      funnel,
    }
  })

  // === STUDENT TABLE ===
  const uniqueStudents = new Map<string, {
    id: string
    name: string | null
    email: string | null
    image: string | null
    sessionsCompleted: number
    totalSessions: number
    avgGrade: number | null
    lastActivity: Date
    status: 'active' | 'inactive' | 'completed'
  }>()

  for (const s of allSessions) {
    const existing = uniqueStudents.get(s.user.id)
    const isCompleted = !!s.completedAt
    const isActive = !s.completedAt && s.lastActivityAt > twoHoursAgo

    if (!existing) {
      uniqueStudents.set(s.user.id, {
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        image: s.user.image,
        sessionsCompleted: isCompleted ? 1 : 0,
        totalSessions: 1,
        avgGrade: s.grade,
        lastActivity: s.lastActivityAt,
        status: isActive ? 'active' : isCompleted ? 'completed' : 'inactive',
      })
    } else {
      existing.sessionsCompleted += isCompleted ? 1 : 0
      existing.totalSessions += 1
      if (s.grade !== null) {
        existing.avgGrade = existing.avgGrade !== null
          ? Math.round((existing.avgGrade + s.grade) / 2)
          : s.grade
      }
      if (s.lastActivityAt > existing.lastActivity) {
        existing.lastActivity = s.lastActivityAt
      }
      if (isActive) existing.status = 'active'
    }
  }

  const students = Array.from(uniqueStudents.values())
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

  // === GENERATE PARTIAL REPORTS (async, don't block response) ===
  // Check for 24h+ inactive sessions without reports
  checkAndGeneratePartialReports(courseId).then(count => {
    if (count > 0) {
      logger.info('dashboard.partial_reports_generated', { courseId, count })
    }
  }).catch((err: unknown) => {
    logger.error('dashboard.partial_reports_failed', { courseId, error: String(err) })
  })

  // === INACTIVITY ALERTS ===
  const twentyFourHoursAgoAlert = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const inactivityAlerts = allSessions
    .filter(s => !s.completedAt && s.lastActivityAt <= twentyFourHoursAgoAlert)
    .map(s => {
      const meta = s.activityId ? activityMeta[s.activityId] : null
      const hoursInactive = Math.round((Date.now() - s.lastActivityAt.getTime()) / 1000 / 60 / 60)
      return {
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        lessonTitle: meta?.lessonTitle || null,
        activityIndex: meta?.index || null,
        activityTotal: meta?.total || null,
        activityTitle: meta?.title || null,
        hoursInactive,
        hasReport: !!allSessions.find(sess => sess.user.id === s.user.id && sess.id === s.id),
      }
    })

  // === SECTIONS LIST for filter ===
  const courseSections = await prisma.section.findMany({
    where: { courseId },
    orderBy: [{ period: { name: 'desc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      period: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
  })

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      career: course.career,
      instructor: course.user?.name || 'Sin instructor',
    },
    sections: courseSections,
    monitoring: {
      active: activeStudents,
      inactive: inactiveStudents,
      completed: completedStudents,
    },
    alerts: inactivityAlerts,
    funnels: lessonFunnels,
    students,
  })
}
