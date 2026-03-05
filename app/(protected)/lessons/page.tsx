import { prisma } from '@/lib/prisma'
import { LessonCard } from '@/components/lessons/lesson-card'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { cn } from '@/lib/utils'

// Tipo para lecciones con curso
type LessonWithCourse = {
  id: string
  title: string
  slug: string
  keyPoints: string[]
  order: number
  course: {
    title: string
    slug: string
  }
}

export default async function LessonsPage() {
  // Obtener todas las lecciones publicadas con info del curso
  const lessons = (await prisma.lesson.findMany({
    where: {
      isPublished: true,
    },
    orderBy: [
      { course: { title: 'asc' } },
      { order: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      keyPoints: true,
      order: true,
      course: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
  })) as LessonWithCourse[]

  // Agrupar por curso
  const courseGroups = lessons.reduce((acc, lesson) => {
    const courseTitle = lesson.course.title
    if (!acc[courseTitle]) {
      acc[courseTitle] = []
    }
    acc[courseTitle].push(lesson)
    return acc
  }, {} as Record<string, LessonWithCourse[]>)

  return (
    <div className="container relative mx-auto px-4 py-12">
      <InteractiveGridPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
          "inset-x-[20%] inset-y-[-20%] h-[200%] skew-y-12",
        )}
      />
      <div className="relative z-10">

        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Lecciones Disponibles</h1>
          <p className="text-lg text-muted-foreground">
            Aprende con instructores IA personalizados
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg text-muted-foreground">
              No hay lecciones disponibles en este momento
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(courseGroups).map(([courseTitle, courseLessons]) => (
              <div key={courseTitle}>
                <h2 className="mb-4 text-2xl font-semibold text-primary">
                  {courseTitle}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {courseLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
