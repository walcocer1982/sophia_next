import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, BookOpen, ChevronRight, GraduationCap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

type CourseWithLessons = {
  id: string
  title: string
  slug: string
  capacidad: string | null
  isPublished: boolean
  createdAt: Date
  careerId: string | null
  user: { name: string | null } | null
  _count: { lessons: number }
  lessons: Array<{ id: string; contentJson: unknown; isPublished: boolean }>
}

function getCourseStats(course: CourseWithLessons) {
  const designedCount = course.lessons.filter((l) => {
    const json = l.contentJson as { activities?: unknown[] } | null
    return json?.activities && json.activities.length > 0
  }).length
  const publishedCount = course.lessons.filter((l) => l.isPublished).length
  const totalLessons = course._count.lessons
  return { designedCount, publishedCount, totalLessons }
}

function CourseCard({ course }: { course: CourseWithLessons; showInstructor?: boolean }) {
  const { designedCount, publishedCount, totalLessons } = getCourseStats(course)

  return (
    <Link
      href={`/planner/${course.id}`}
      className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-gray-800 group-hover:text-primary">
          {course.title}
        </h3>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
      </div>

      {course.capacidad && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-500">
          {course.capacidad}
        </p>
      )}

      {course.user?.name && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-indigo-600">
          <Users className="h-3 w-3" />
          {course.user.name}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{totalLessons} sesiones</span>
        <span className="text-gray-300">|</span>
        <span>
          {designedCount}/{totalLessons} diseñadas
        </span>
        <span className="text-gray-300">|</span>
        <span>
          {publishedCount}/{totalLessons} publicadas
        </span>
        {!course.isPublished && (
          <>
            <span className="text-gray-300">|</span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-600">
              Borrador
            </span>
          </>
        )}
      </div>
    </Link>
  )
}

export default async function PlannerPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isSuperadmin = session.user.role === 'SUPERADMIN'

  if (isSuperadmin) {
    return <SuperadminPlannerView />
  }

  // ADMIN view: only their own courses
  const courses = (await prisma.course.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      capacidad: true,
      isPublished: true,
      createdAt: true,
      careerId: true,
      user: { select: { name: true } },
      _count: { select: { lessons: true } },
      lessons: {
        select: { id: true, contentJson: true, isPublished: true },
        orderBy: { order: 'asc' },
      },
    },
  })) as CourseWithLessons[]

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold">Mis Cursos</h1>
          <p className="text-muted-foreground">
            Crea y gestiona tus cursos con ayuda de la IA
          </p>
        </div>
        <Link href="/planner/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="mb-2 text-lg font-medium text-gray-600">
            No tienes cursos aún
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Crea tu primer curso y la IA te ayudará a definir la capacidad y las sesiones
          </p>
          <Link href="/planner/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Crear mi primer curso
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

async function SuperadminPlannerView() {
  const [allCourses, careers] = await Promise.all([
    prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        capacidad: true,
        isPublished: true,
        createdAt: true,
        careerId: true,
        user: { select: { name: true } },
        _count: { select: { lessons: true } },
        lessons: {
          select: { id: true, contentJson: true, isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
    }) as Promise<CourseWithLessons[]>,
    prisma.career.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // Group courses by career
  const coursesByCareer = new Map<string | null, CourseWithLessons[]>()
  for (const course of allCourses) {
    const key = course.careerId
    if (!coursesByCareer.has(key)) coursesByCareer.set(key, [])
    coursesByCareer.get(key)!.push(course)
  }

  const careerMap = new Map(careers.map((c) => [c.id, c.name]))

  // Compute global stats
  const totalLessons = allCourses.reduce((sum, c) => sum + c._count.lessons, 0)
  const allLessons = allCourses.flatMap((c) => c.lessons)
  const designedTotal = allLessons.filter((l) => {
    const json = l.contentJson as { activities?: unknown[] } | null
    return json?.activities && json.activities.length > 0
  }).length
  const publishedTotal = allLessons.filter((l) => l.isPublished).length

  // Ordered career groups: existing careers first, then null
  const careerGroups: Array<{ id: string | null; name: string }> = []
  for (const career of careers) {
    if (coursesByCareer.has(career.id)) {
      careerGroups.push({ id: career.id, name: career.name })
    }
  }
  if (coursesByCareer.has(null)) {
    careerGroups.push({ id: null, name: 'Sin Carrera Asignada' })
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold">Todos los Cursos</h1>
          <p className="text-muted-foreground">
            Vista general de cursos por carrera
          </p>
        </div>
        <Link href="/planner/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{careers.length}</p>
          <p className="text-xs text-gray-500">Carreras</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{allCourses.length}</p>
          <p className="text-xs text-gray-500">Cursos</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-emerald-600">{publishedTotal}</p>
          <p className="text-xs text-gray-500">Sesiones publicadas</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">
            {designedTotal}<span className="text-sm font-normal text-gray-400">/{totalLessons}</span>
          </p>
          <p className="text-xs text-gray-500">Sesiones diseñadas</p>
        </div>
      </div>

      {/* Career groups */}
      {allCourses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="mb-2 text-lg font-medium text-gray-600">
            No hay cursos en el sistema
          </h2>
        </div>
      ) : (
        <div className="space-y-10">
          {careerGroups.map((group) => {
            const courses = coursesByCareer.get(group.id) || []
            return (
              <section key={group.id ?? 'null'}>
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-700">
                    {group.name}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} showInstructor />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
