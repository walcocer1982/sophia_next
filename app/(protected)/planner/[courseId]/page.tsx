import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Pencil, Image, ClipboardCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublishToggle } from '@/components/planner/publish-toggle'
import { DeleteCourseButton } from '@/components/planner/delete-course-button'

type CourseWithLessons = {
  id: string
  title: string
  capacidad: string | null
  instructor: string
  isPublished: boolean
  lessons: Array<{
    id: string
    title: string
    objective: string
    order: number
    keyPoints: string[]
    contentJson: unknown
    isPublished: boolean
  }>
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { courseId } = await params

  const course = (await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      capacidad: true,
      instructor: true,
      isPublished: true,
      userId: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          objective: true,
          order: true,
          keyPoints: true,
          contentJson: true,
          isPublished: true,
        },
      },
    },
  })) as (CourseWithLessons & { userId: string | null }) | null

  if (!course || course.userId !== session.user.id) {
    notFound()
  }

  const designedCount = course.lessons.filter((l) => {
    const json = l.contentJson as { activities?: unknown[] } | null
    return json?.activities && json.activities.length > 0
  }).length

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        href="/planner"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis Cursos
      </Link>

      {/* Course header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">{course.title}</h1>
            {course.capacidad && (
              <p className="max-w-2xl text-muted-foreground">
                {course.capacidad}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!course.isPublished && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                Borrador
              </span>
            )}
            <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>{course.lessons.length} sesiones</span>
          <span className="text-gray-300">|</span>
          <span>{designedCount} diseñadas</span>
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Sesiones</h2>

        {course.lessons.map((lesson) => {
          const json = lesson.contentJson as { activities?: Array<{
            verified?: boolean
            teaching?: { images?: Array<{ url: string }>, image?: { url: string } }
          }> } | null
          const isDesigned =
            json?.activities && json.activities.length > 0
          const hasResources = json?.activities?.some(
            (a) => (a.teaching?.images && a.teaching.images.length > 0) || a.teaching?.image?.url
          ) ?? false
          const allVerified = isDesigned && json!.activities!.every((a) => a.verified === true)

          return (
            <div
              key={lesson.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4"
            >
              {/* Status icon */}
              {isDesigned ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300" />
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">
                    {lesson.order}.
                  </span>
                  <h3 className="font-medium text-gray-800">
                    {lesson.title}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {lesson.objective}
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 gap-2">
                {isDesigned && (
                  <>
                    <Link href={`/planner/${courseId}/${lesson.id}/verification`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 ${allVerified ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}`}
                      >
                        {allVerified ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <ClipboardCheck className="h-3.5 w-3.5" />
                        )}
                        Verificación
                      </Button>
                    </Link>
                    <Link href={`/planner/${courseId}/${lesson.id}/resources`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 ${hasResources ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}`}
                      >
                        {hasResources ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Image className="h-3.5 w-3.5" />
                        )}
                        Recursos
                      </Button>
                    </Link>
                  </>
                )}
                {isDesigned && (
                  <PublishToggle
                    lessonId={lesson.id}
                    initialPublished={lesson.isPublished}
                  />
                )}
                <Link href={`/planner/${courseId}/${lesson.id}`}>
                  <Button
                    variant={isDesigned ? 'outline' : 'default'}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {isDesigned ? 'Editar' : 'Diseñar'}
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
