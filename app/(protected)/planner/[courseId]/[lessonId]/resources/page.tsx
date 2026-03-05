import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { ResourceManager } from '@/components/planner/resource-manager'
import type { Activity } from '@/types/lesson'

type LessonWithCourse = {
  id: string
  title: string
  keyPoints: string[]
  contentJson: unknown
  course: {
    id: string
    title: string
    userId: string | null
  }
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { courseId, lessonId } = await params

  const lesson = (await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      keyPoints: true,
      contentJson: true,
      course: {
        select: { id: true, title: true, userId: true },
      },
    },
  })) as LessonWithCourse | null

  if (!lesson || lesson.course.userId !== session.user.id || lesson.course.id !== courseId) {
    notFound()
  }

  const contentJson = lesson.contentJson as {
    activities?: Activity[]
    instrucciones?: string[]
    contenidoTecnico?: Array<{ keyPoint: string; contenido: string }>
  } | null
  const activities = contentJson?.activities || []

  if (activities.length === 0) {
    notFound()
  }

  return (
    <ResourceManager
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      courseId={courseId}
      courseTitle={lesson.course.title}
      activities={activities}
      keyPoints={lesson.keyPoints}
      instrucciones={contentJson?.instrucciones || []}
      contenidoTecnico={contentJson?.contenidoTecnico || []}
      imageFolder={`sophia/${courseId}/${lessonId}`}
    />
  )
}
