import { prisma } from '@/lib/prisma'
import { LessonCard } from '@/components/lessons/lesson-card'

export default async function LessonsPage() {
  const lessons = await prisma.lesson.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      order: 'asc',
    },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      category: true,
      estimatedMinutes: true,
      difficulty: true,
    },
  })

  return (
    <div className="container mx-auto px-4 py-12">
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
  )
}
