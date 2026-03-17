'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

// Types
interface ActiveStudent {
  userId: string
  name: string | null
  email: string | null
  image: string | null
  sessionId: string
  activityIndex: number | null
  activityTotal: number | null
  activityTitle: string | null
  lessonTitle: string | null
  attempts: number
  percentage: number
  criteriaMatched: string[]
  criteriaMissing: string[]
  lastActivityAt: string
}

interface InactiveStudent {
  userId: string
  name: string | null
  email: string | null
  image: string | null
  lastActivityAt: string
  hoursInactive: number
}

interface FunnelActivity {
  id: string
  index: number
  title: string
  completed: number
  total: number
  percentage: number
  avgAttempts: number
  comprehension: Record<string, number>
  mostFailedCriterion: string | null
}

interface LessonFunnel {
  lessonId: string
  lessonTitle: string
  totalStudents: number
  funnel: FunnelActivity[]
}

interface StudentRow {
  id: string
  name: string | null
  email: string | null
  image: string | null
  sessionsCompleted: number
  totalSessions: number
  avgGrade: number | null
  lastActivity: string
  status: 'active' | 'inactive' | 'completed'
}

interface InactivityAlert {
  userId: string
  name: string | null
  email: string | null
  lessonTitle: string | null
  activityIndex: number | null
  activityTotal: number | null
  activityTitle: string | null
  hoursInactive: number
}

interface CourseData {
  course: {
    id: string
    title: string
    career: { name: string } | null
    instructor: string
  }
  monitoring: {
    active: ActiveStudent[]
    inactive: InactiveStudent[]
  }
  alerts: InactivityAlert[]
  funnels: LessonFunnel[]
  students: StudentRow[]
}

export default function CourseDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [data, setData] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null)

  const role = session?.user?.role || 'STUDENT'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/${courseId}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error loading course dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    if (role === 'STUDENT') {
      router.push('/lessons')
      return
    }
    fetchData()

    // Polling cada 15s para monitoreo en tiempo real
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [role, router, fetchData])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="h-60 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { course, monitoring, alerts, funnels, students } = data

  const filteredStudents = students.filter(s =>
    (s.name?.toLowerCase().includes(search.toLowerCase())) ||
    (s.email?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-sm text-gray-500">
            {course.career?.name || 'Sin carrera'} • {course.instructor}
          </p>
        </div>
      </div>

      {/* === INACTIVITY ALERTS (24h+) === */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Inactividad
              <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-normal">
                {alerts.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.userId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {alert.name || alert.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {alert.lessonTitle}
                        {alert.activityIndex && alert.activityTotal && (
                          <> — Act {alert.activityIndex}/{alert.activityTotal}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-amber-700 font-medium bg-amber-100 px-2 py-1 rounded">
                      {alert.hoursInactive}h inactivo
                    </span>
                    <Link
                      href={`/dashboard/${courseId}/${alert.userId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* === REAL-TIME MONITORING === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            Monitoreo en Tiempo Real
            <span className="text-xs text-gray-400 font-normal ml-2">
              (actualización cada 15s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monitoring.active.length === 0 && monitoring.inactive.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay estudiantes con sesiones activas</p>
          ) : (
            <div className="space-y-2">
              {/* Active students */}
              {monitoring.active.map(s => (
                <div
                  key={s.userId}
                  className="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {s.name || s.email}
                      </span>
                      {s.activityIndex && s.activityTotal && (
                        <span className="text-xs text-gray-500">
                          Act {s.activityIndex}/{s.activityTotal}
                        </span>
                      )}
                    </div>
                    {s.activityTitle && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {s.lessonTitle} — {s.activityTitle}
                      </p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-20">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 text-right mt-0.5">{Math.round(s.percentage)}%</p>
                  </div>

                  {/* Alerts */}
                  {s.attempts >= 3 && (
                    <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {s.attempts} intentos
                    </div>
                  )}

                  {s.criteriaMissing.length > 0 && s.attempts >= 2 && (
                    <div className="hidden lg:block max-w-[200px]">
                      <p className="text-[10px] text-red-600 truncate">
                        Falta: {s.criteriaMissing[0]}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Inactive students */}
              {monitoring.inactive.map(s => (
                <div
                  key={s.userId}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="flex h-2 w-2">
                    <span className="inline-flex rounded-full h-2 w-2 bg-gray-300" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-500 truncate">
                      {s.name || s.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    Inactivo {s.hoursInactive}h
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === ACTIVITY FUNNEL === */}
      {funnels.map(lesson => (
        <Card key={lesson.lessonId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {lesson.lessonTitle}
              <span className="text-xs text-gray-400 font-normal ml-2">
                {lesson.totalStudents} estudiante{lesson.totalStudents !== 1 ? 's' : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lesson.funnel.map(act => {
                const isExpanded = expandedFunnel === act.id
                const isBottleneck = act.percentage < 50 && act.index > 1

                return (
                  <div key={act.id}>
                    <button
                      onClick={() => setExpandedFunnel(isExpanded ? null : act.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-8 shrink-0">
                          #{act.index}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`truncate max-w-[70%] ${isBottleneck ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                              {act.title}
                            </span>
                            <span className="text-gray-500">
                              {act.completed}/{act.total} ({act.percentage}%)
                            </span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                act.percentage >= 80 ? 'bg-green-500' :
                                act.percentage >= 50 ? 'bg-blue-500' :
                                act.percentage >= 30 ? 'bg-amber-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${act.percentage}%` }}
                            />
                          </div>
                        </div>
                        {isBottleneck && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-2 ml-11 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                        <div className="flex gap-6">
                          <div>
                            <span className="text-gray-500">Promedio intentos: </span>
                            <span className="font-medium">{act.avgAttempts}</span>
                          </div>
                          {act.mostFailedCriterion && (
                            <div className="flex items-start gap-1">
                              <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                              <span className="text-red-600">
                                Criterio más fallado: {act.mostFailedCriterion}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Comprehension distribution */}
                        <div>
                          <span className="text-gray-500">Comprensión:</span>
                          <div className="flex gap-1 mt-1">
                            {Object.entries(act.comprehension).map(([level, count]) => {
                              const total = Object.values(act.comprehension).reduce((a, b) => a + b, 0)
                              const pct = total > 0 ? Math.round((count / total) * 100) : 0
                              if (pct === 0) return null
                              const colors: Record<string, string> = {
                                memorized: 'bg-red-300',
                                understood: 'bg-blue-300',
                                applied: 'bg-green-300',
                                analyzed: 'bg-purple-300',
                              }
                              const labels: Record<string, string> = {
                                memorized: 'Memorizado',
                                understood: 'Comprendido',
                                applied: 'Aplicado',
                                analyzed: 'Analizado',
                              }
                              return (
                                <div
                                  key={level}
                                  className={`${colors[level]} rounded px-2 py-0.5 text-[10px] font-medium text-white`}
                                  title={`${labels[level]}: ${pct}%`}
                                  style={{ width: `${Math.max(pct, 15)}%` }}
                                >
                                  {labels[level]} {pct}%
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* === STUDENT TABLE === */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Estudiantes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Estudiante</th>
                  <th className="pb-2 font-medium">Sesiones</th>
                  <th className="pb-2 font-medium">Nota</th>
                  <th className="pb-2 font-medium">Última actividad</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <Link
                        href={`/dashboard/${courseId}/${s.id}`}
                        className="hover:text-blue-600"
                      >
                        <p className="font-medium text-gray-900">{s.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </Link>
                    </td>
                    <td className="py-3 text-gray-600">
                      {s.sessionsCompleted}/{s.totalSessions}
                    </td>
                    <td className="py-3">
                      {s.avgGrade !== null ? (
                        <span className={`font-medium ${
                          s.avgGrade >= 80 ? 'text-green-700' :
                          s.avgGrade >= 60 ? 'text-blue-700' :
                          s.avgGrade >= 40 ? 'text-amber-700' : 'text-red-700'
                        }`}>
                          {s.avgGrade}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {new Date(s.lastActivity).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No se encontraron estudiantes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'completed' }) {
  const config = {
    active: {
      label: 'Activo',
      className: 'bg-green-100 text-green-700',
      icon: <span className="relative flex h-1.5 w-1.5 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" /></span>,
    },
    inactive: {
      label: 'Inactivo',
      className: 'bg-gray-100 text-gray-600',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    completed: {
      label: 'Completó',
      className: 'bg-blue-100 text-blue-700',
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
  }

  const { label, className, icon } = config[status]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  )
}
