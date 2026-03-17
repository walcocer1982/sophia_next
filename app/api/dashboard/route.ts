import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

export async function GET() {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result
  const session = result

  const role = session.user.role || 'ADMIN'
  const userId = session.user.id

  // SUPERADMIN ve todos los cursos, ADMIN solo los suyos
  const whereClause = role === 'SUPERADMIN'
    ? { deletedAt: null }
    : { userId, deletedAt: null }

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
          sessions: {
            where: { isTest: false },
            select: {
              id: true,
              userId: true,
              completedAt: true,
              grade: true,
              lastActivityAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  // Build lesson-level rows grouped by career > course
  const lessonRows: Array<{
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
  }> = []

  let globalStudents = new Set<string>()
  let globalCompleted = 0
  let globalTotal = 0
  let globalActiveNow = 0
  const allGrades: number[] = []

  for (const course of courses) {
    for (const lesson of course.lessons) {
      const uniqueStudents = new Set(lesson.sessions.map(s => s.userId))
      const completed = lesson.sessions.filter(s => s.completedAt)
      const grades = completed.filter(s => s.grade !== null).map(s => s.grade as number)
      const avgGrade = grades.length > 0
        ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
        : null
      const activeNow = lesson.sessions.filter(
        s => !s.completedAt && s.lastActivityAt > twoHoursAgo
      ).length

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
      })

      // Global stats
      for (const s of lesson.sessions) {
        globalStudents.add(s.userId)
      }
      globalCompleted += completed.length
      globalTotal += lesson.sessions.length
      globalActiveNow += activeNow
      allGrades.push(...grades)
    }
  }

  const globalAvgGrade = allGrades.length > 0
    ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
    : null

  return NextResponse.json({
    stats: {
      totalStudents: globalStudents.size,
      completionRate: globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 100) : 0,
      avgGrade: globalAvgGrade,
      activeNow: globalActiveNow,
    },
    lessons: lessonRows,
  })
}
