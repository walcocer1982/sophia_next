'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, AlertTriangle, CheckCircle, Users } from 'lucide-react'
import Link from 'next/link'

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

interface DashboardData {
  stats: {
    activeNow: number
    inDifficulty: number
    completedToday: number
    totalStudents: number
  }
  lessons: LessonRow[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

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
          title="Activos Ahora"
          value={stats.activeNow}
          icon={<Activity className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
          highlight={stats.activeNow > 0}
        />
        <StatCard
          title="En Dificultad"
          value={stats.inDifficulty}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          bgColor="bg-amber-50"
          highlight={stats.inDifficulty > 0}
          description="3+ intentos en actividad actual"
        />
        <StatCard
          title="Completaron Hoy"
          value={stats.completedToday}
          icon={<CheckCircle className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Total Estudiantes"
          value={stats.totalStudents}
          icon={<Users className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
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
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Embudo de Actividades</th>
                      <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseLessons.map(lesson => (
                      <tr
                        key={lesson.lessonId}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <Link
                            href={`/dashboard/${courseId}`}
                            className="text-gray-900 hover:text-blue-600 hover:underline font-medium text-sm"
                          >
                            {lesson.lessonTitle}
                          </Link>
                        </td>
                        <td className="text-center py-2.5 px-3 text-gray-600">
                          {lesson.totalStudents}
                        </td>
                        <td className="py-2.5 px-3">
                          {lesson.funnel.length > 0 ? (
                            <div className="space-y-0.5">
                              {/* Compact funnel: show bars + click to expand */}
                              {(expandedLesson === lesson.lessonId ? lesson.funnel : lesson.funnel.slice(0, 3)).map(step => (
                                <div key={step.index} className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 w-5 shrink-0">#{step.index}</span>
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                                    <div
                                      className={`h-full rounded-full ${
                                        step.percentage >= 70 ? 'bg-blue-500' :
                                        step.percentage >= 40 ? 'bg-amber-400' :
                                        'bg-red-400'
                                      }`}
                                      style={{ width: `${Math.max(step.percentage, 3)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-500 w-14 shrink-0">
                                    {step.reached}/{lesson.totalStudents}
                                  </span>
                                </div>
                              ))}
                              {lesson.funnel.length > 3 && (
                                <button
                                  onClick={() => setExpandedLesson(
                                    expandedLesson === lesson.lessonId ? null : lesson.lessonId
                                  )}
                                  className="text-[10px] text-blue-500 hover:underline"
                                >
                                  {expandedLesson === lesson.lessonId ? 'ver menos' : `+${lesson.funnel.length - 3} más`}
                                </button>
                              )}
                              {/* Completed count */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-green-600 w-5 shrink-0">&#10003;</span>
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                                  <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${Math.max(lesson.completionRate, 3)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-green-600 font-medium w-14 shrink-0">
                                  {lesson.completedCount}/{lesson.totalStudents}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sin actividades</span>
                          )}
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <div className="flex flex-col items-center gap-1">
                            {lesson.activeNow > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-green-700 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                                </span>
                                {lesson.activeNow} activo{lesson.activeNow > 1 ? 's' : ''}
                              </span>
                            )}
                            {lesson.inDifficulty > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {lesson.inDifficulty} en dificultad
                              </span>
                            )}
                            {lesson.completedToday > 0 && (
                              <span className="text-[10px] text-blue-600">
                                {lesson.completedToday} hoy
                              </span>
                            )}
                            {lesson.activeNow === 0 && lesson.inDifficulty === 0 && lesson.completedToday === 0 && (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </div>
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
  description,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  bgColor: string
  highlight?: boolean
  description?: string
}) {
  return (
    <Card className={`${highlight ? 'ring-2 ring-purple-300' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {description && (
              <p className="text-[10px] text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
