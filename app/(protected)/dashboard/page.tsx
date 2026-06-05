'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, AlertTriangle, CheckCircle, Users, History } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/formatters'

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
  track: 'REGULAR' | 'CONTINUA'
  sedeCodes: string[]
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

interface HistoryEntry {
  studentName: string
  courseTitle: string
  careerName: string
  lessonTitle: string
  completedAt: string
  grade: number | null
}

interface DashboardData {
  stats: {
    activeNow: number
    inDifficulty: number
    completedToday: number
    totalStudents: number
    totalCompleted: number
  }
  lessons: LessonRow[]
  history: HistoryEntry[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  // Filtros: sede (codigo o 'all') + track (REGULAR / CONTINUA / 'all')
  const [filterSede, setFilterSede] = useState<string>('all')
  const [filterTrack, setFilterTrack] = useState<'all' | 'REGULAR' | 'CONTINUA'>('all')

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

  const { stats, lessons, history } = data

  // Sedes únicas presentes en los cursos (para el dropdown)
  const allSedes = Array.from(
    new Set(lessons.flatMap((l) => l.sedeCodes))
  ).sort()

  // Aplico filtros antes de agrupar
  const filteredLessons = lessons.filter((l) => {
    if (filterTrack !== 'all' && l.track !== filterTrack) return false
    if (filterSede !== 'all') {
      // 'no-sede' = cursos sin ninguna sede asignada
      if (filterSede === 'no-sede') {
        if (l.sedeCodes.length > 0) return false
      } else if (!l.sedeCodes.includes(filterSede)) {
        return false
      }
    }
    return true
  })

  // Group lessons by career > course
  const grouped: Record<string, {
    careerName: string
    courses: Record<string, {
      courseTitle: string
      courseId: string
      instructor: string
      track: 'REGULAR' | 'CONTINUA'
      sedeCodes: string[]
      lessons: LessonRow[]
    }>
  }> = {}

  for (const row of filteredLessons) {
    const careerKey = row.careerId || 'sin-carrera'
    if (!grouped[careerKey]) {
      grouped[careerKey] = { careerName: row.careerName, courses: {} }
    }
    if (!grouped[careerKey].courses[row.courseId]) {
      grouped[careerKey].courses[row.courseId] = {
        courseTitle: row.courseTitle,
        courseId: row.courseId,
        instructor: row.instructor,
        track: row.track,
        sedeCodes: row.sedeCodes,
        lessons: [],
      }
    }
    grouped[careerKey].courses[row.courseId].lessons.push(row)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isSuperadmin ? 'Vista general de todos los cursos' : 'Monitorea el progreso de tus estudiantes'}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtros:</span>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Track:</span>
          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value as typeof filterTrack)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="all">Todos</option>
            <option value="REGULAR">Regular</option>
            <option value="CONTINUA">Continua</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Sede:</span>
          <select
            value={filterSede}
            onChange={(e) => setFilterSede(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
          >
            <option value="all">Todas</option>
            {allSedes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
            <option value="no-sede">Sin sede</option>
          </select>
        </label>

        {(filterTrack !== 'all' || filterSede !== 'all') && (
          <button
            type="button"
            onClick={() => { setFilterTrack('all'); setFilterSede('all') }}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-gray-500">
          {filteredLessons.length} de {lessons.length} lecciones
        </span>
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

          {Object.entries(courses).map(([courseId, { courseTitle, instructor, track, sedeCodes, lessons: courseLessons }]) => (
            <div key={courseId} className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-medium text-gray-700">{courseTitle}</h3>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  track === 'CONTINUA'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {track === 'CONTINUA' ? 'CONTINUA' : 'REGULAR'}
                </span>
                {sedeCodes.length > 0 && (
                  <div className="flex items-center gap-1">
                    {sedeCodes.map((code) => (
                      <code
                        key={code}
                        className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                )}
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

      {/* Historial de finalizaciones */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 border-b pb-2">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-800">Historial de finalizaciones</h2>
          <span className="text-xs text-gray-400">
            ({history.length}{history.length === 200 ? '+' : ''} registros)
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Aún no hay lecciones completadas.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Alumno</th>
                  {isSuperadmin && (
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Carrera</th>
                  )}
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Curso</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Lección</th>
                  <th className="text-center py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Nota</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Completado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-800">{h.studentName}</td>
                    {isSuperadmin && (
                      <td className="py-2.5 px-3 text-gray-500">{h.careerName}</td>
                    )}
                    <td className="py-2.5 px-3 text-gray-600">{h.courseTitle}</td>
                    <td className="py-2.5 px-3 text-gray-600">{h.lessonTitle}</td>
                    <td className="text-center py-2.5 px-3">
                      {h.grade !== null ? (
                        <span className={`font-semibold ${
                          h.grade >= 70 ? 'text-emerald-600' :
                          h.grade >= 50 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {h.grade}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(h.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
