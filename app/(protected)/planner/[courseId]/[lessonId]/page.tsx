import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PlannerLayout } from '@/components/planner/planner-layout'
import type { CourseContext } from '@/types/planner'

import type { Activity } from '@/types/lesson'
import type { KeyPointContenido } from '@/types/planner'

type SavedContentJson = {
  activities?: Activity[]
  instrucciones?: string[]
  contenidoTecnico?: KeyPointContenido[]
} | null

type LessonWithCourse = {
  id: string
  title: string
  objective: string
  order: number
  keyPoints: string[]
  contentJson: SavedContentJson
  course: {
    id: string
    title: string
    capacidad: string | null
    instructor: string
    userId: string | null
    lessons: Array<{ title: string; order: number }>
  }
}

export default async function SessionPlannerPage({
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
      objective: true,
      order: true,
      keyPoints: true,
      contentJson: true,
      course: {
        select: {
          id: true,
          title: true,
          capacidad: true,
          instructor: true,
          userId: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { title: true, order: true },
          },
        },
      },
    },
  })) as LessonWithCourse | null

  if (!lesson || lesson.course.id !== courseId || lesson.course.userId !== session.user.id) {
    notFound()
  }

  // Check if lesson already has saved design data
  const contentJson = lesson.contentJson as SavedContentJson
  const savedActivities = contentJson?.activities || []
  const hasSavedData = savedActivities.length > 0

  const courseContext: CourseContext = {
    courseId: lesson.course.id,
    courseTitle: lesson.course.title,
    capacidad: lesson.course.capacidad || '',
    instructor: lesson.course.instructor,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonObjective: lesson.objective,
    existingLessons: lesson.course.lessons,
    ...(hasSavedData && {
      savedData: {
        keyPoints: lesson.keyPoints || [],
        instrucciones: contentJson?.instrucciones || [],
        contenidoTecnico: contentJson?.contenidoTecnico || [],
        activities: savedActivities,
      },
    }),
  }

  return <PlannerLayout courseContext={courseContext} />
}
