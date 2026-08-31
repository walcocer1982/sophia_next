import { prisma } from '../lib/prisma'

// Revisa las respuestas de la encuesta de Sophia en TUTORÍA (/learn), no /eval.
// Distinción: las sesiones de kiosko tienen assessmentParticipant; tutoría no.
async function main() {
  const surveys = await prisma.lessonSurvey.findMany({
    orderBy: { submittedAt: 'desc' },
    include: {
      session: {
        select: {
          isTest: true,
          startedAt: true,
          assessmentParticipant: { select: { id: true } },
          user: { select: { name: true, email: true, role: true } },
          lesson: { select: { title: true } },
        },
      },
    },
  })

  // Dump completo de TODAS las encuestas para inspección
  console.log('=== TODAS LAS ENCUESTAS (', surveys.length, ') ===')
  for (const s of surveys) {
    console.log(JSON.stringify({
      nps: s.npsScore, utilidad: s.utility, razon: s.npsReason,
      esKiosko: !!s.session?.assessmentParticipant,
      leccion: s.session?.lesson?.title,
      estudiante: s.session?.user?.name || s.session?.user?.email,
      fecha: s.submittedAt.toISOString().slice(0, 10),
    }))
  }
  console.log('=== RESUMEN TUTORÍA ===')

  // Tutoría = sin assessmentParticipant (no es kiosko)
  const tutoria = surveys.filter((s) => !s.session?.assessmentParticipant)

  const out = {
    total_encuestas: surveys.length,
    de_tutoria: tutoria.length,
    de_eval_kiosko: surveys.length - tutoria.length,
    nps: {} as Record<string, number>,
    utilidad: {} as Record<string, number>,
    idioma: {} as Record<string, number>,
    nps_score: 0,
    respuestas: [] as unknown[],
  }

  let promoters = 0, detractors = 0
  for (const s of tutoria) {
    out.nps[String(s.npsScore)] = (out.nps[String(s.npsScore)] || 0) + 1
    out.utilidad[s.utility] = (out.utilidad[s.utility] || 0) + 1
    out.idioma[s.language] = (out.idioma[s.language] || 0) + 1
    if (s.npsScore >= 9) promoters++
    else if (s.npsScore <= 6) detractors++
    out.respuestas.push({
      nps: s.npsScore,
      utilidad: s.utility,
      razon: s.npsReason || null,
      idioma: s.language,
      leccion: s.session?.lesson?.title ?? null,
      estudiante: s.session?.user?.name || s.session?.user?.email || null,
      rol: s.session?.user?.role ?? null,
      esTest: s.session?.isTest ?? null,
      fecha: s.submittedAt.toISOString().slice(0, 10),
    })
  }
  out.nps_score = tutoria.length > 0
    ? Math.round(((promoters - detractors) / tutoria.length) * 100)
    : 0

  console.log(JSON.stringify(out, null, 2))
}

main().finally(() => prisma.$disconnect())
