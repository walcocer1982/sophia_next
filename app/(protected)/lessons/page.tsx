import { prisma } from '@/lib/prisma'
import { LessonCard } from '@/components/lessons/lesson-card'
import { hardcodedLesson } from '@/data/lesson01'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { cn } from '@/lib/utils'

// Tipo explícito para las lecciones (debe coincidir con LessonCardProps)
type LessonWithDetails = {
  id: string
  title: string
  description: string | null
  slug: string
  estimatedMinutes: number | null
}

export default async function LessonsPage() {
  // Si está activo el flag de lección hardcodeada, usar solo esa
  const useHardcodedLesson = process.env.ALLOW_HARDCODE_LESSON === '1'

  let lessons: LessonWithDetails[]

  if (useHardcodedLesson) {
    // Usar lección hardcodeada en formato compatible con LessonCard
    lessons = [
      {
        id: hardcodedLesson.id,
        title: hardcodedLesson.lesson.title,
        description: hardcodedLesson.lesson.description,
        slug: 'html-basico', // Slug estático para la lección hardcodeada
        estimatedMinutes: hardcodedLesson.lesson.duration_minutes,
      },
    ]
  } else {
    // Usar lecciones de la base de datos
    lessons = (await prisma.lesson.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        estimatedMinutes: true,
      },
    })) as LessonWithDetails[]
  }

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
