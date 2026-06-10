import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AssessmentKiosko } from '@/components/eval/assessment-kiosko'
import { getKioskoStatus } from '@/lib/kiosko-status'
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
      campaign: { select: { startDate: true, endDate: true } },
      timeLimitMin: true,
      collectEmail: true,
      collectDni: true,
      lessonId: true,
      lesson: {
        select: {
          title: true,
          objective: true,
          keyPoints: true,
          contentJson: true,
          videoUrl: true,
          course: { select: { voiceEnabled: true } },
        },
      },
    },
  })

  if (!assessment) {
    notFound()
  }

  // Extract per-activity images con metadata (activityId + showWhen + orden).
  // Antes se aplastaba todo + slice(0,3) — ahora preservamos el contexto para
  // que el kiosko pueda filtrar por actividad actual y mostrar UNA imagen a
  // la vez, sincronizada con lo que Sophia menciona en cada momento.
  const content = assessment.lesson.contentJson as unknown as LessonContent
  const galleryImages = (content?.activities || []).flatMap((a) => {
    const imgs = a.teaching?.images || (a.teaching?.image ? [a.teaching.image] : [])
    return imgs
      .filter((img) => img.url)
      .map((img, idx) => ({
        activityId: a.id,
        url: img.url,
        description: img.description || '',
        showWhen: img.showWhen || ('on_reference' as const),
        order: idx,
      }))
  })

  // Estado derivado: el kiosko hereda el periodo de su campaña (se abre y
  // cierra solo según las fechas del evento). isActive queda como kill switch.
  const status = getKioskoStatus(assessment)

  return (
    <AssessmentKiosko
      assessment={{
        id: assessment.id,
        code: assessment.code,
        title: assessment.title,
        status,
        availableFrom: assessment.campaign?.startDate.toISOString() ?? null,
        timeLimitMin: assessment.timeLimitMin,
        collectEmail: assessment.collectEmail,
        collectDni: assessment.collectDni,
        lessonId: assessment.lessonId,
        lessonTitle: assessment.lesson.title,
        lessonObjective: assessment.lesson.objective,
        keyPoints: assessment.lesson.keyPoints,
        galleryImages,
        videoUrl: assessment.lesson.videoUrl,
        voiceEnabled: assessment.lesson.course?.voiceEnabled ?? true,
      }}
    />
  )
}
