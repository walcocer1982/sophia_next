import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { notFound, redirect } from 'next/navigation'
import { AssessmentsManager } from '@/components/admin/assessments-manager'

export const dynamic = 'force-dynamic'

export default async function AssessmentsPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { courseId, lessonId } = await params

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, courseId },
    include: {
      course: { select: { userId: true, careerId: true, title: true } },
    },
  })
  if (!lesson) notFound()

  // Permission check
  const canAccess =
    isOwnerOrSuperadmin(session, lesson.course.userId) ||
    isAdminSameCareer(session, lesson.course.careerId)
  if (!canAccess) notFound()

  const assessments = await prisma.assessment.findMany({
    where: { lessonId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { participants: true } },
    },
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Evaluaciones</h1>
      <p className="text-sm text-gray-500 mb-6">
        Curso: {lesson.course.title} · Lección: {lesson.title}
      </p>

      <AssessmentsManager
        lessonId={lessonId}
        courseId={courseId}
        initialAssessments={assessments.map(a => ({
          id: a.id,
          code: a.code,
          title: a.title,
          isActive: a.isActive,
          timeLimitMin: a.timeLimitMin,
          collectDni: a.collectDni,
          collectEmail: a.collectEmail,
          createdAt: a.createdAt.toISOString(),
          participantsCount: a._count.participants,
        }))}
      />
    </div>
  )
}
