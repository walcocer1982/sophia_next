'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Users, CheckCircle, Award, Activity } from 'lucide-react'
import Link from 'next/link'

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
}

interface DashboardData {
  stats: {
    totalStudents: number
    completionRate: number
    avgGrade: number | null
    activeNow: number
  }
  lessons: LessonRow[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const role = session?.user?.role || 'STUDENT'
  const isSuperadmin = role === 'SUPERADMIN'

  useEffect(() => {
    if (role === 'STUDENT') {
      router.push('/lessons')
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          setData(await res.json())
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [role, router])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { stats, lessons } = data

  // Group lessons by career > course
  const grouped: Record<string, {
    careerName: string
    courses: Record<string, {
      courseTitle: string
      courseId: string
      instructor: string
      lessons: LessonRow[]
    }>
  }> = {}

  for (const row of lessons) {
    const careerKey = row.careerId || 'sin-carrera'
    if (!grouped[careerKey]) {
      grouped[careerKey] = { careerName: row.careerName, courses: {} }
    }
    if (!grouped[careerKey].courses[row.courseId]) {
      grouped[careerKey].courses[row.courseId] = {
        courseTitle: row.courseTitle,
        courseId: row.courseId,
        instructor: row.instructor,
        lessons: [],
      }
    }
    grouped[careerKey].courses[row.courseId].lessons.push(row)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isSuperadmin ? 'Vista general de todos los cursos' : 'Monitorea el progreso de tus estudiantes'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes"
          value={stats.totalStudents}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Tasa de Completación"
          value={`${stats.completionRate}%`}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard
          title="Nota Promedio"
          value={stats.avgGrade !== null ? `${stats.avgGrade}/100` : '—'}
          icon={<Award className="h-5 w-5 text-amber-600" />}
          bgColor="bg-amber-50"
        />
        <StatCard
          title="Activos Ahora"
          value={stats.activeNow}
          icon={<Activity className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
          highlight={stats.activeNow > 0}
        />
      </div>

      {/* Lesson Tables grouped by Career > Course */}
      {Object.entries(grouped).map(([careerKey, { careerName, courses }]) => (
        <div key={careerKey} className="space-y-6">
          {isSuperadmin && (
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">{careerName}</h2>
          )}

          {Object.entries(courses).map(([courseId, { courseTitle, instructor, lessons: courseLessons }]) => (
            <div key={courseId} className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-medium text-gray-700">{courseTitle}</h3>
                {isSuperadmin && (
                  <span className="text-xs text-gray-400">{instructor}</span>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Sesión / Lección</th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Estudiantes</th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Completaron</th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Nota Prom</th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseLessons.map(lesson => (
                      <tr
                        key={lesson.lessonId}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/dashboard/${courseId}`}
                            className="text-gray-900 hover:text-blue-600 hover:underline font-medium"
                          >
                            {lesson.lessonTitle}
                          </Link>
                        </td>
                        <td className="text-center py-3 px-3 text-gray-600">
                          {lesson.totalStudents}
                        </td>
                        <td className="text-center py-3 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  lesson.completionRate === 100
                                    ? 'bg-green-500'
                                    : lesson.completionRate >= 50
                                      ? 'bg-blue-500'
                                      : lesson.completionRate > 0
                                        ? 'bg-amber-500'
                                        : 'bg-gray-300'
                                }`}
                                style={{ width: `${lesson.completionRate}%` }}
                              />
                            </div>
                            <span className="text-gray-700 text-xs font-medium min-w-[60px]">
                              {lesson.completedCount}/{lesson.totalStudents} ({lesson.completionRate}%)
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3">
                          {lesson.avgGrade !== null ? (
                            <span className={`font-semibold ${
                              lesson.avgGrade >= 70
                                ? 'text-green-700'
                                : lesson.avgGrade >= 50
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                            }`}>
                              {lesson.avgGrade}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-3">
                          {lesson.activeNow > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded-full">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                              </span>
                              {lesson.activeNow} activo{lesson.activeNow > 1 ? 's' : ''}
                            </span>
                          ) : lesson.completionRate === 100 ? (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Completado</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}

      {lessons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No hay cursos con lecciones publicadas.</p>
          <Link href="/planner" className="text-blue-600 hover:underline mt-2 inline-block">
            Ir al Planificador
          </Link>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
  highlight,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  bgColor: string
  highlight?: boolean
}) {
  return (
    <Card className={`${highlight ? 'ring-2 ring-purple-300' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
