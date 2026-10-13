import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cursoEditable } from '@/lib/planner/course-access'
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

  // Mismo criterio que la ruta de guardado (antes solo dueño o SUPERADMIN).
  if (!lesson || lesson.course.id !== courseId || !(await cursoEditable(session, courseId))) {
    notFound()
  }

  const contentJson = lesson.contentJson as {
    activities?: Activity[]
  } | null
  const activities = contentJson?.activities || []

  if (activities.length === 0) {
    notFound()
  }

  // Bloques del panel de los que un criterio puede exigir frases (lib/quote-check.ts).
  const citables = activities.flatMap((a) =>
    (a.teaching?.blocks ?? [])
      .filter((b) => b.type === 'text' || b.type === 'table' || b.type === 'case' || b.type === 'formula')
      .map((b) => ({ id: b.id, title: b.title })),
  )

  return (
    <VerificationManager
      citables={citables}
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      courseId={courseId}
      courseTitle={lesson.course.title}
      activities={activities}
      keyPoints={lesson.keyPoints}
    />
  )
}
