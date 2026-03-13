import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isOwnerOrSuperadmin } from '@/lib/auth-utils'
import { notFound, redirect } from 'next/navigation'
import { VerificationManager } from '@/components/planner/verification-manager'
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

export default async function VerificationPage({
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

  if (!lesson || !isOwnerOrSuperadmin(session, lesson.course.userId) || lesson.course.id !== courseId) {
    notFound()
  }

  const contentJson = lesson.contentJson as {
    activities?: Activity[]
  } | null
  const activities = contentJson?.activities || []

  if (activities.length === 0) {
    notFound()
  }

  return (
    <VerificationManager
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      courseId={courseId}
      courseTitle={lesson.course.title}
      activities={activities}
      keyPoints={lesson.keyPoints}
    />
  )
}
