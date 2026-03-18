'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, AlertTriangle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

// Types
interface MonitoredStudent {
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
  startedAt: string
  lastActivityAt: string
  activeMinutes: number
  messageCount: number
  grade: number | null
  lastActivityLevel: string | null
  overallLevel: string | null
  hoursInactive?: number
  completedAt?: string
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
    active: MonitoredStudent[]
    inactive: MonitoredStudent[]
    completed: MonitoredStudent[]
  }
  alerts: InactivityAlert[]
  funnels: LessonFunnel[]
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

  const { course, monitoring, alerts, funnels } = data

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
          <div className="flex items-center justify-between">
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
          {monitoring.active.length === 0 && monitoring.inactive.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay estudiantes con sesiones activas</p>
          ) : (() => {
            const filterStudent = (s: MonitoredStudent) =>
              !search || (s.name?.toLowerCase().includes(search.toLowerCase())) || (s.email?.toLowerCase().includes(search.toLowerCase()))
            const filteredActive = monitoring.active.filter(filterStudent)
            const filteredInactive = monitoring.inactive.filter(filterStudent)
            const filteredCompleted = monitoring.completed.filter(filterStudent)

            return filteredActive.length === 0 && filteredInactive.length === 0 && filteredCompleted.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No se encontraron estudiantes</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium pl-3">Estado</th>
                    <th className="pb-2 font-medium">Estudiante</th>
                    <th className="pb-2 font-medium">Actividad</th>
                    <th className="pb-2 font-medium">Progreso</th>
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Ingresó</th>
                    <th className="pb-2 font-medium">Último msg</th>
                    <th className="pb-2 font-medium">Tiempo</th>
                    <th className="pb-2 font-medium">Msgs</th>
                    <th className="pb-2 font-medium">Nivel</th>
                    <th className="pb-2 font-medium">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Active students */}
                  {filteredActive.map(s => (
                    <tr key={s.userId} className="border-b border-green-50 bg-green-50/30 hover:bg-green-50">
                      <td className="py-1.5 pl-3">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      </td>
                      <td className="py-1.5">
                        <Link href={`/dashboard/${courseId}/${s.userId}`} className="hover:text-blue-600">
                          <p className="font-medium text-gray-900 text-sm">{s.name || s.email}</p>
                        </Link>
                      </td>
                      <td className="py-1.5">
                        {s.activityIndex && s.activityTotal ? (
                          <div>
                            <span className="text-xs font-medium">Act {s.activityIndex}/{s.activityTotal}</span>
                            {s.activityTitle && (
                              <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{s.activityTitle}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.percentage}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{Math.round(s.percentage)}%</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-xs text-gray-600">
                        {new Date(s.startedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-600">
                        {new Date(s.startedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-600">
                        {new Date(s.lastActivityAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-600">
                        {s.activeMinutes} min
                      </td>
                      <td className="py-1.5 text-xs text-gray-600">
                        {s.messageCount}
                      </td>
                      <td className="py-1.5">
                        <RubricBadge level={s.overallLevel} />
                      </td>
                      <td className="py-1.5">
                        {s.attempts >= 3 ? (
                          <div>
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {s.attempts} intentos
                            </span>
                            {s.criteriaMissing.length > 0 && (
                              <p className="text-[10px] text-red-600 truncate max-w-[120px] mt-0.5">
                                Falta: {s.criteriaMissing[0]}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Inactive students */}
                  {filteredInactive.map(s => (
                    <tr key={s.userId} className="border-b border-gray-50 bg-gray-50/30 hover:bg-gray-50">
                      <td className="py-1.5 pl-3">
                        <span className="inline-flex rounded-full h-2 w-2 bg-gray-300" />
                      </td>
                      <td className="py-1.5">
                        <Link href={`/dashboard/${courseId}/${s.userId}`} className="hover:text-blue-600">
                          <p className="font-medium text-gray-500 text-sm">{s.name || s.email}</p>
                        </Link>
                      </td>
                      <td className="py-1.5">
                        {s.activityIndex && s.activityTotal ? (
                          <div>
                            <span className="text-xs text-gray-500">Act {s.activityIndex}/{s.activityTotal}</span>
                            {s.activityTitle && (
                              <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{s.activityTitle}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-400 rounded-full" style={{ width: `${s.percentage}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{Math.round(s.percentage)}%</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">
                        {new Date(s.startedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">
                        {new Date(s.startedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">
                        {new Date(s.lastActivityAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">
                        {s.activeMinutes} min
                      </td>
                      <td className="py-1.5 text-xs text-gray-400">
                        {s.messageCount}
                      </td>
                      <td className="py-1.5">
                        <RubricBadge level={s.overallLevel} muted />
                      </td>
                      <td className="py-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-2.5 w-2.5" />
                          {s.hoursInactive}h inactivo
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Completed students */}
                  {filteredCompleted.map(s => (
                    <tr key={`completed-${s.userId}-${s.sessionId}`} className="border-b border-blue-50 bg-blue-50/20 hover:bg-blue-50/40">
                      <td className="py-1.5 pl-3">
                        <span className="inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </td>
                      <td className="py-1.5">
                        <Link href={`/dashboard/${courseId}/${s.userId}`} className="hover:text-blue-600">
                          <p className="font-medium text-gray-700 text-sm">{s.name || s.email}</p>
                        </Link>
                      </td>
                      <td className="py-1.5">
                        <span className="text-xs text-blue-600 font-medium">Completó</span>
                        {s.lessonTitle && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{s.lessonTitle}</p>
                        )}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                          </div>
                          <span className="text-xs text-blue-600">100%</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-xs text-gray-500">
                        {new Date(s.startedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-500">
                        {new Date(s.startedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-500">
                        {new Date(s.lastActivityAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-1.5 text-xs text-gray-500">
                        {s.activeMinutes} min
                      </td>
                      <td className="py-1.5 text-xs text-gray-500">
                        {s.messageCount}
                      </td>
                      <td className="py-1.5">
                        <RubricBadge level={s.overallLevel} />
                      </td>
                      <td className="py-1.5">
                        <span className="text-xs text-blue-600">Completado</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          })()}
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

    </div>
  )
}

function RubricBadge({ level, muted }: { level: string | null; muted?: boolean }) {
  if (!level) return <span className="text-gray-300 text-xs">—</span>

  const config: Record<string, { label: string; bg: string; text: string }> = {
    logrado_destacado: { label: 'Destacado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    logrado: { label: 'Logrado', bg: 'bg-blue-100', text: 'text-blue-700' },
    en_proceso: { label: 'En proceso', bg: 'bg-amber-100', text: 'text-amber-700' },
    en_inicio: { label: 'En inicio', bg: 'bg-red-100', text: 'text-red-600' },
  }

  const c = config[level] || config.en_proceso
  const opacity = muted ? 'opacity-60' : ''

  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text} ${opacity}`}>
      {c.label}
    </span>
  )
}
