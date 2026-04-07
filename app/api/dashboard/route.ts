import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

export async function GET() {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result
  const session = result

  const role = session.user.role || 'ADMIN'
  const userId = session.user.id

  // Get courses where user is section instructor
  const sectionAssignments = role !== 'SUPERADMIN'
    ? await prisma.sectionInstructor.findMany({
        where: { userId },
        select: { section: { select: { courseId: true, id: true } } },
      })
    : []
  const sectionCourseIds = [...new Set(sectionAssignments.map(s => s.section.courseId))]

  // SUPERADMIN: all courses. ADMIN: own courses + section instructor courses + same career courses
  const careerId = session.user.careerId
  const whereClause = role === 'SUPERADMIN'
    ? { deletedAt: null }
    : {
        deletedAt: null,
        OR: [
          { userId },
          ...(sectionCourseIds.length > 0 ? [{ id: { in: sectionCourseIds } }] : []),
          ...(careerId ? [{ careerId }] : []),
        ],
      }

  const courses = await prisma.course.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      career: {
        select: { id: true, name: true },
      },
      user: {
        select: { name: true },
      },
      lessons: {
        where: { isPublished: true },
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
              grade: true,
              lastActivityAt: true,
              activityId: true,
              activities: {
                where: { status: 'COMPLETED' },
                select: { activityId: true, attempts: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  interface FunnelStep {
    index: number
    title: string
    reached: number
    percentage: number
  }

  interface LessonRow {
    courseId: string
    courseTitle: string
    careerId: string | null
    careerName: string
    instructor: string
    lessonId: string
    lessonTitle: string
    totalStudents: number
    completedCount: number
    completionRate: number
    avgGrade: number | null
    activeNow: number
    inDifficulty: number
    completedToday: number
    funnel: FunnelStep[]
  }

  const lessonRows: LessonRow[] = []

  const globalStudents = new Set<string>()
  let globalActiveNow = 0
  let globalInDifficulty = 0
  let globalCompletedToday = 0

  for (const course of courses) {
    for (const lesson of course.lessons) {
      const contentJson = lesson.contentJson as LessonContent | null
      const activities = contentJson?.activities || []
      const uniqueStudents = new Set(lesson.sessions.map(s => s.userId))
      const completed = lesson.sessions.filter(s => s.completedAt)
      const grades = completed.filter(s => s.grade !== null).map(s => s.grade as number)
      const avgGrade = grades.length > 0
        ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
        : null
      const activeNow = lesson.sessions.filter(
        s => !s.completedAt && s.lastActivityAt > twoHoursAgo
      ).length

      // Students in difficulty: active with 3+ attempts on current activity
      const inDifficulty = lesson.sessions.filter(s => {
        if (s.completedAt || s.lastActivityAt <= twoHoursAgo) return false
        const currentActProgress = s.activities.find(a => a.activityId === s.activityId)
        return currentActProgress && currentActProgress.attempts >= 3
      }).length

      // Completed today
      const completedToday = lesson.sessions.filter(
        s => s.completedAt && new Date(s.completedAt) >= todayStart
      ).length

      // Build activity funnel: how many students reached each activity
      const funnel: FunnelStep[] = activities.map((act, idx) => {
        // A student "reached" an activity if they completed it OR are currently on it
        const reached = lesson.sessions.filter(s => {
          // Completed the lesson = reached all activities
          if (s.completedAt) return true
          // Completed this specific activity
          if (s.activities.some(a => a.activityId === act.id)) return true
          // Currently on this activity
          if (s.activityId === act.id) return true
          // Currently on a LATER activity (so they passed this one)
          const currentIdx = activities.findIndex(a => a.id === s.activityId)
          return currentIdx > idx
        }).length

        return {
          index: idx + 1,
          title: act.teaching?.agent_instruction?.slice(0, 60) || `Actividad ${idx + 1}`,
          reached,
          percentage: uniqueStudents.size > 0 ? Math.round((reached / uniqueStudents.size) * 100) : 0,
        }
      })

      lessonRows.push({
        courseId: course.id,
        courseTitle: course.title,
        careerId: course.career?.id || null,
        careerName: course.career?.name || 'Sin carrera',
        instructor: course.user?.name || 'Sin instructor',
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        totalStudents: uniqueStudents.size,
        completedCount: completed.length,
        completionRate: uniqueStudents.size > 0
          ? Math.round((completed.length / uniqueStudents.size) * 100)
          : 0,
        avgGrade,
        activeNow,
        inDifficulty,
        completedToday,
        funnel,
      })

      // Global stats
      for (const s of lesson.sessions) {
        globalStudents.add(s.userId)
      }
      globalActiveNow += activeNow
      globalInDifficulty += inDifficulty
      globalCompletedToday += completedToday
    }
  }

  return NextResponse.json({
    stats: {
      activeNow: globalActiveNow,
      inDifficulty: globalInDifficulty,
      completedToday: globalCompletedToday,
      totalStudents: globalStudents.size,
    },
    lessons: lessonRows,
  })
}
