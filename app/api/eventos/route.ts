import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * GET /api/eventos
 *
 * Devuelve:
 *  - campaigns: lista de EventCampaigns con sus assessments (kioskos) anidados
 *  - orphanAssessments: kioskos que NO tienen campaign asignada
 *
 * Cada assessment incluye stats: cantidad de participantes, NPS promedio,
 * % completados. Esto le da al instructor visión consolidada por evento.
 */
export async function GET() {
  const auth = await requireRole('ADMIN')
  if (auth instanceof NextResponse) return auth

  // 1) Traer todas las campaigns + sus assessments
  const campaigns = await prisma.eventCampaign.findMany({
    orderBy: [{ isArchived: 'asc' }, { startDate: 'desc' }],
    include: {
      assessments: {
        include: {
          lesson: { select: { title: true } },
          participants: {
            select: { id: true, completedAt: true, grade: true },
          },
        },
      },
    },
  })

  // 2) Traer assessments huérfanos (sin campaign)
  const orphans = await prisma.assessment.findMany({
    where: { campaignId: null },
    include: {
      lesson: { select: { title: true } },
      participants: {
        select: { id: true, completedAt: true, grade: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 3) Traer surveys por assessment para calcular NPS — un solo query
  const allAssessmentIds = [
    ...campaigns.flatMap((c) => c.assessments.map((a) => a.id)),
    ...orphans.map((a) => a.id),
  ]
  const surveys = await prisma.lessonSurvey.findMany({
    where: {
      session: {
        assessmentParticipant: {
          assessmentId: { in: allAssessmentIds },
        },
      },
    },
    select: {
      npsScore: true,
      session: {
        select: {
          assessmentParticipant: { select: { assessmentId: true } },
        },
      },
    },
  })

  // Agrupar surveys por assessmentId
  const surveysByAssessment = new Map<string, number[]>()
  for (const s of surveys) {
    const aid = s.session?.assessmentParticipant?.assessmentId
    if (!aid) continue
    const arr = surveysByAssessment.get(aid) ?? []
    arr.push(s.npsScore)
    surveysByAssessment.set(aid, arr)
  }

  // Helper para formatear stats de un assessment
  const formatAssessment = (a: typeof orphans[0]) => {
    const totalParticipants = a.participants.length
    const completed = a.participants.filter((p) => p.completedAt).length
    const npsScores = surveysByAssessment.get(a.id) ?? []
    const npsAvg = npsScores.length > 0
      ? Math.round((npsScores.reduce((s, n) => s + n, 0) / npsScores.length) * 10) / 10
      : null
    const promoters = npsScores.filter((n) => n >= 9).length
    const detractors = npsScores.filter((n) => n <= 6).length
    const nps = npsScores.length > 0
      ? Math.round(((promoters - detractors) / npsScores.length) * 100)
      : null

    return {
      id: a.id,
      code: a.code,
      title: a.title,
      lessonTitle: a.lesson.title,
      isActive: a.isActive,
      timeLimitMin: a.timeLimitMin,
      createdAt: a.createdAt,
      closedAt: a.closedAt,
      stats: {
        totalParticipants,
        completed,
        completionRate: totalParticipants > 0
          ? Math.round((completed / totalParticipants) * 100)
          : 0,
        npsAvg,
        npsScore: nps, // -100 to +100
        surveyCount: npsScores.length,
      },
    }
  }

  // Opciones para el form de crear nuevo kiosko: lecciones disponibles y
  // campaigns activas (no archivadas).
  const lessonsForOptions = await prisma.lesson.findMany({
    where: { course: { deletedAt: null } },
    orderBy: [{ course: { title: 'asc' } }, { order: 'asc' }],
    select: {
      id: true,
      title: true,
      course: { select: { id: true, title: true, track: true } },
    },
  })

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      startDate: c.startDate,
      endDate: c.endDate,
      location: c.location,
      url: c.url,
      isArchived: c.isArchived,
      assessments: c.assessments.map((a) => formatAssessment(a)),
    })),
    orphanAssessments: orphans.map((a) => formatAssessment(a)),
    options: {
      lessons: lessonsForOptions.map((l) => ({
        id: l.id,
        title: l.title,
        courseId: l.course.id,
        courseTitle: l.course.title,
        courseTrack: l.course.track,
      })),
      activeCampaigns: campaigns
        .filter((c) => !c.isArchived)
        .map((c) => ({ id: c.id, name: c.name, shortName: c.shortName })),
    },
  })
}
