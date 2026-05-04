import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AssessmentKiosko } from '@/components/eval/assessment-kiosko'
import type { LessonContent } from '@/types/lesson'

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
      lesson: {
        select: {
          title: true,
          objective: true,
          keyPoints: true,
          contentJson: true,
        },
      },
    },
  })

  if (!assessment) {
    notFound()
  }

  // Extract images from the first activity's teaching content
  const content = assessment.lesson.contentJson as unknown as LessonContent
  const allImages: { url: string; description: string }[] = []
  for (const activity of content?.activities || []) {
    const imgs = activity.teaching?.images || []
    for (const img of imgs) {
      if (img.url) allImages.push({ url: img.url, description: img.description || '' })
    }
  }
  // Limit to 3 images max for compact gallery
  const galleryImages = allImages.slice(0, 3)

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
        lessonObjective: assessment.lesson.objective,
        keyPoints: assessment.lesson.keyPoints,
        galleryImages,
      }}
    />
  )
}
