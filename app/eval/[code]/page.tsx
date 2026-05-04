import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AssessmentKiosko } from '@/components/eval/assessment-kiosko'

export const dynamic = 'force-dynamic'

export default async function EvalPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      title: true,
      isActive: true,
      timeLimitMin: true,
      collectEmail: true,
      collectDni: true,
      lesson: { select: { title: true } },
    },
  })

  if (!assessment) {
    notFound()
  }

  return (
    <AssessmentKiosko
      assessment={{
        id: assessment.id,
        code: assessment.code,
        title: assessment.title,
        isActive: assessment.isActive,
        timeLimitMin: assessment.timeLimitMin,
        collectEmail: assessment.collectEmail,
        collectDni: assessment.collectDni,
        lessonTitle: assessment.lesson.title,
      }}
    />
  )
}
