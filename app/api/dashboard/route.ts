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
      careerId: true,
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
              passed: true,
              grade: true,
              startedAt: true,
              lastActivityAt: true,
              activityId: true,
              progress: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calcular stats por curso
  const coursesWithStats = courses.map(course => {
    const allSessions = course.lessons.flatMap(l => l.sessions)
    const uniqueStudents = new Set(allSessions.map(s => s.userId))
    const completedSessions = allSessions.filter(s => s.completedAt)
    const grades = completedSessions.filter(s => s.grade !== null).map(s => s.grade as number)
    const avgGrade = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null

    // Sesiones activas: no completadas y con actividad en las últimas 2h
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const activeSessions = allSessions.filter(
      s => !s.completedAt && s.lastActivityAt > twoHoursAgo
    )

    const completionRate = allSessions.length > 0
      ? Math.round((completedSessions.length / allSessions.length) * 100)
      : 0

    return {
      id: course.id,
      title: course.title,
      career: course.career,
      instructor: course.user?.name || 'Sin instructor',
      totalStudents: uniqueStudents.size,
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
      completionRate,
      avgGrade,
      activeNow: activeSessions.length,
      publishedLessons: course.lessons.length,
    }
  })

  // Stats globales
  const allSessions = coursesWithStats.flatMap(c => [c])
  const totalStudentsSet = new Set(
    courses.flatMap(c => c.lessons.flatMap(l => l.sessions.map(s => s.userId)))
  )
  const totalCompleted = coursesWithStats.reduce((a, c) => a + c.completedSessions, 0)
  const totalSessionsCount = coursesWithStats.reduce((a, c) => a + c.totalSessions, 0)
  const allGrades = coursesWithStats.filter(c => c.avgGrade !== null).map(c => c.avgGrade as number)
  const globalAvgGrade = allGrades.length > 0
    ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
    : null
  const totalActiveNow = coursesWithStats.reduce((a, c) => a + c.activeNow, 0)
  const globalCompletionRate = totalSessionsCount > 0
    ? Math.round((totalCompleted / totalSessionsCount) * 100)
    : 0

  return NextResponse.json({
    stats: {
      totalStudents: totalStudentsSet.size,
      completionRate: globalCompletionRate,
      avgGrade: globalAvgGrade,
      activeNow: totalActiveNow,
    },
    courses: coursesWithStats,
  })
}
