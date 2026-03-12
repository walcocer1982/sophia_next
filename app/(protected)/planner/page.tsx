import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, BookOpen, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

type CourseWithLessons = {
  id: string
  title: string
  slug: string
  capacidad: string | null
  isPublished: boolean
  createdAt: Date
  _count: { lessons: number }
  lessons: Array<{ id: string; contentJson: unknown }>
}

export default async function PlannerPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

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
      _count: { select: { lessons: true } },
      lessons: {
        select: { id: true, contentJson: true },
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
          {courses.map((course) => {
            const designedCount = course.lessons.filter((l) => {
              const json = l.contentJson as { activities?: unknown[] } | null
              return json?.activities && json.activities.length > 0
            }).length
            const totalLessons = course._count.lessons

            return (
              <Link
                key={course.id}
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

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{totalLessons} sesiones</span>
                  <span className="text-gray-300">|</span>
                  <span>
                    {designedCount}/{totalLessons} diseñadas
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
          })}
        </div>
      )}
    </div>
  )
}
