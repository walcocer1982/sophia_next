import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const { courseId } = await params

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
  const allSessions = course.lessons.flatMap(l => l.sessions)

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
        lastActivityAt: s.lastActivityAt,
      }
    })

  // Inactive students (started but no activity in 2h+ and not completed)
  const inactiveStudents = allSessions
    .filter(s => !s.completedAt && s.lastActivityAt <= twoHoursAgo)
    .map(s => ({
      userId: s.user.id,
      name: s.user.name,
      email: s.user.email,
      image: s.user.image,
      lastActivityAt: s.lastActivityAt,
      hoursInactive: Math.round((Date.now() - s.lastActivityAt.getTime()) / 1000 / 60 / 60),
    }))

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

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      career: course.career,
      instructor: course.user?.name || 'Sin instructor',
    },
    monitoring: {
      active: activeStudents,
      inactive: inactiveStudents,
    },
    funnels: lessonFunnels,
    students,
  })
}
