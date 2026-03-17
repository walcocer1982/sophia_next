'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, Award, Activity } from 'lucide-react'
import Link from 'next/link'

interface CourseStats {
  id: string
  title: string
  career: { id: string; name: string } | null
  instructor: string
  totalStudents: number
  totalSessions: number
  completedSessions: number
  completionRate: number
  avgGrade: number | null
  activeNow: number
  publishedLessons: number
}

interface DashboardData {
  stats: {
    totalStudents: number
    completionRate: number
    avgGrade: number | null
    activeNow: number
  }
  courses: CourseStats[]
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { stats, courses } = data

  // Agrupar por carrera para SUPERADMIN
  const coursesByCareer = isSuperadmin
    ? courses.reduce<Record<string, { careerName: string; courses: CourseStats[] }>>((acc, course) => {
        const key = course.career?.id || 'sin-carrera'
        if (!acc[key]) {
          acc[key] = { careerName: course.career?.name || 'Sin carrera', courses: [] }
        }
        acc[key].courses.push(course)
        return acc
      }, {})
    : null

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

      {/* Courses */}
      {isSuperadmin && coursesByCareer ? (
        // SUPERADMIN: agrupado por carrera
        Object.entries(coursesByCareer).map(([careerId, { careerName, courses: careerCourses }]) => (
          <div key={careerId} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">{careerName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careerCourses.map(course => (
                <CourseCard key={course.id} course={course} showInstructor />
              ))}
            </div>
          </div>
        ))
      ) : (
        // ADMIN: lista simple
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Mis Cursos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {courses.length === 0 && (
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

function CourseCard({ course, showInstructor }: { course: CourseStats; showInstructor?: boolean }) {
  return (
    <Link href={`/dashboard/${course.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{course.title}</CardTitle>
          {showInstructor && (
            <p className="text-xs text-gray-500">{course.instructor}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{course.completedSessions}/{course.totalSessions} sesiones completadas</span>
                <span>{course.completionRate}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${course.completionRate}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{course.totalStudents} estudiantes</span>
              <span>{course.publishedLessons} lecciones</span>
              {course.avgGrade !== null && (
                <span className="font-medium text-gray-700">Nota: {course.avgGrade}</span>
              )}
            </div>

            {/* Active now badge */}
            {course.activeNow > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs text-green-700 font-medium">
                  {course.activeNow} activo{course.activeNow > 1 ? 's' : ''} ahora
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
