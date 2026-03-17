'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, BookOpen, Award, MessageSquare, CheckCircle,
  XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Cell, PieChart, Pie } from 'recharts'

// Types
interface ActivityDetail {
  id: string
  index: number
  title: string
  status: string
  attempts: number
  tangentCount: number
  understandingLevel: string | null
  responseType: string | null
  criteriaMatched: string[]
  criteriaMissing: string[]
  score: number | null
  completedAt: string | null
}

interface LessonDetail {
  lessonId: string
  lessonTitle: string
  sessionId: string | null
  startedAt: string | null
  completedAt: string | null
  grade: number | null
  passed: boolean
  attempt: number
  duration: number | null
  totalMessages: number
  summaryText: string | null
  currentActivityId: string | null
  activities: ActivityDetail[]
}

interface StudentData {
  student: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  course: { id: string; title: string }
  stats: {
    completedLessons: number
    totalLessons: number
    avgGrade: number | null
    totalMessages: number
    comprehension: Record<string, number>
    gradeTrend: Array<{ lesson: string; grade: number }>
  }
  lessons: LessonDetail[]
}

const levelLabels: Record<string, string> = {
  memorized: 'Memorizado',
  understood: 'Comprendido',
  applied: 'Aplicado',
  analyzed: 'Analizado',
}

const levelColors: Record<string, string> = {
  memorized: '#f87171',
  understood: '#60a5fa',
  applied: '#34d399',
  analyzed: '#a78bfa',
}

export default function StudentDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const studentId = params.studentId as string

  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  const role = session?.user?.role || 'STUDENT'

  useEffect(() => {
    if (role === 'STUDENT') {
      router.push('/lessons')
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/dashboard/${courseId}/${studentId}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
          // Auto-expand first lesson
          if (result.lessons.length > 0) {
            setExpandedLesson(result.lessons[0].lessonId)
          }
        }
      } catch (error) {
        console.error('Error loading student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [role, router, courseId, studentId])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="h-60 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { student, course, stats, lessons } = data

  // Chart data
  const comprehensionData = Object.entries(stats.comprehension)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({
      name: levelLabels[level] || level,
      value: count,
      fill: levelColors[level] || '#94a3b8',
    }))

  const gradeTrendData = stats.gradeTrend.map(g => ({
    name: g.lesson.length > 20 ? g.lesson.slice(0, 20) + '...' : g.lesson,
    grade: g.grade,
    fill: g.grade >= 80 ? '#34d399' : g.grade >= 60 ? '#60a5fa' : g.grade >= 40 ? '#fbbf24' : '#f87171',
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${courseId}`}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <Avatar className="h-12 w-12">
          <AvatarImage src={student.image || undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
            {student.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.name || 'Sin nombre'}</h1>
          <p className="text-sm text-gray-500">{student.email} • {course.title}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lecciones Completadas"
          value={`${stats.completedLessons}/${stats.totalLessons}`}
          icon={<BookOpen className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Nota Promedio"
          value={stats.avgGrade !== null ? `${stats.avgGrade}/100` : '—'}
          icon={<Award className="h-5 w-5 text-amber-600" />}
          bgColor="bg-amber-50"
        />
        <StatCard
          title="Total Mensajes"
          value={stats.totalMessages}
          icon={<MessageSquare className="h-5 w-5 text-purple-600" />}
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Progreso"
          value={stats.totalLessons > 0
            ? `${Math.round((stats.completedLessons / stats.totalLessons) * 100)}%`
            : '0%'}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
      </div>

      {/* Charts Row */}
      {(comprehensionData.length > 0 || gradeTrendData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Comprehension Distribution */}
          {comprehensionData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribución de Comprensión</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={Object.fromEntries(
                    comprehensionData.map(d => [d.name, { label: d.name, color: d.fill }])
                  )}
                  className="h-[200px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={comprehensionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {comprehensionData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {comprehensionData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grade Trend */}
          {gradeTrendData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notas por Lección</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    grade: { label: 'Nota', color: '#60a5fa' },
                  }}
                  className="h-[200px] w-full"
                >
                  <BarChart data={gradeTrendData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} fontSize={11} />
                    <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="grade" radius={4}>
                      {gradeTrendData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lessons Detail */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Detalle por Lección</h2>

        {lessons.map(lesson => {
          const isExpanded = expandedLesson === lesson.lessonId
          const completedActivities = lesson.activities.filter(a => a.status === 'COMPLETED').length
          const totalActivities = lesson.activities.length

          return (
            <Card key={lesson.lessonId}>
              <button
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.lessonId)}
                className="w-full text-left"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      <CardTitle className="text-sm">{lesson.lessonTitle}</CardTitle>
                      {lesson.completedAt && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Completada</span>
                      )}
                      {!lesson.completedAt && lesson.startedAt && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">En progreso</span>
                      )}
                      {!lesson.startedAt && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">No iniciada</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {lesson.grade !== null && (
                        <span className={`font-bold ${
                          lesson.grade >= 80 ? 'text-green-700' :
                          lesson.grade >= 60 ? 'text-blue-700' :
                          lesson.grade >= 40 ? 'text-amber-700' : 'text-red-700'
                        }`}>
                          {lesson.grade}/100
                        </span>
                      )}
                      {lesson.duration !== null && (
                        <span>{lesson.duration} min</span>
                      )}
                      <span>{completedActivities}/{totalActivities} act.</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2 ml-6">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0}%` }}
                    />
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="pt-0">
                  {/* AI Report */}
                  {lesson.summaryText && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        Reporte de IA
                      </p>
                      <div className="text-sm text-blue-900 whitespace-pre-line">
                        {lesson.summaryText}
                      </div>
                    </div>
                  )}

                  {/* Activities Table */}
                  <div className="space-y-2 ml-6">
                    {lesson.activities.map(act => (
                      <div
                        key={act.id}
                        className={`p-3 rounded-lg border text-sm ${
                          act.status === 'COMPLETED'
                            ? 'bg-green-50 border-green-100'
                            : act.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 border-amber-100'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {act.status === 'COMPLETED' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : act.status === 'IN_PROGRESS' ? (
                              <Clock className="h-4 w-4 text-amber-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300" />
                            )}
                            <span className="text-xs text-gray-400">#{act.index}</span>
                            <span className="text-gray-700 truncate max-w-md">{act.title}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {act.score !== null && (
                              <span className={`font-bold ${
                                act.score >= 80 ? 'text-green-700' :
                                act.score >= 60 ? 'text-blue-700' :
                                act.score >= 40 ? 'text-amber-700' : 'text-red-700'
                              }`}>
                                {act.score}pts
                              </span>
                            )}
                            {act.understandingLevel && (
                              <span
                                className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                                style={{ backgroundColor: levelColors[act.understandingLevel] }}
                              >
                                {levelLabels[act.understandingLevel]}
                              </span>
                            )}
                            {act.attempts > 0 && (
                              <span className={`${act.attempts >= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                                {act.attempts} intent{act.attempts !== 1 ? 'os' : 'o'}
                              </span>
                            )}
                            {act.tangentCount > 0 && (
                              <span className="text-gray-400 flex items-center gap-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                {act.tangentCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Criteria detail for completed activities */}
                        {act.status === 'COMPLETED' && act.criteriaMatched.length > 0 && (
                          <div className="mt-2 ml-6 text-xs text-gray-500">
                            {act.criteriaMatched.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 mr-2">
                                <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                                {c}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Missing criteria for in-progress */}
                        {act.status === 'IN_PROGRESS' && act.criteriaMissing.length > 0 && (
                          <div className="mt-2 ml-6 text-xs">
                            {act.criteriaMissing.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 mr-2 text-red-500">
                                <XCircle className="h-2.5 w-2.5" />
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  title, value, icon, bgColor,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  bgColor: string
}) {
  return (
    <Card>
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
