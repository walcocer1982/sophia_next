import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { AssessmentResults } from '@/components/admin/assessment-results'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string; id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      lesson: { select: { title: true } },
      participants: {
        orderBy: { startedAt: 'desc' },
      },
    },
  })

  if (!assessment) notFound()
  if (assessment.createdById !== session.user.id && session.user.role !== 'SUPERADMIN') {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Resultados</h1>
      <p className="text-sm text-gray-500 mb-6">
        {assessment.title} · Código <span className="font-mono">{assessment.code}</span>
      </p>

      <AssessmentResults
        assessmentId={assessment.id}
        title={assessment.title}
        code={assessment.code}
        participants={assessment.participants.map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          dni: p.dni,
          email: p.email,
          startedAt: p.startedAt.toISOString(),
          completedAt: p.completedAt?.toISOString() || null,
          grade: p.grade,
          gradeOver20: p.gradeOver20,
          passed: p.passed,
        }))}
      />
    </div>
  )
}
