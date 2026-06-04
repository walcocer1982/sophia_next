import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

interface ActivityData {
  activityId: string
  attempts: number
  tangentCount: number
  evidenceData: unknown
}

/**
 * Generate an AI report summarizing the student's performance on a lesson.
 * Called asynchronously after lesson completion — does not block the response.
 *
 * El reporte recibe el ALCANCE de la lección (objective + keyPoints +
 * must_include por actividad) y se le prohíbe explícitamente inventar temas
 * fuera de ese alcance. Antes el modelo inventaba recomendaciones de temas
 * avanzados ("cálculo de productividad", "geometría de malla", etc) que
 * NUNCA se enseñaron, porque no recibía el alcance como contexto.
 */
export async function generateLessonReport(
  sessionId: string,
  lessonTitle: string,
  lessonObjective: string,
  lessonKeyPoints: string[],
  activities: ActivityData[],
  grade: number,
  contentJson: LessonContent
): Promise<void> {
  // Lookup por activityId (NO por idx de array) — session.activities viene en
  // orden de inserción del DB, que NO coincide con contentJson.activities en
  // orden de definición. Antes pareaba por idx y cruzaba data de actividades
  // distintas en el reporte.
  const activitySummaries = (contentJson.activities ?? []).map((actDef, idx) => {
    const ap = activities.find((a) => a.activityId === actDef.id)
    const evidence = ap?.evidenceData as {
      attempts?: Array<{
        studentResponse?: string
        analysis?: {
          understanding_level?: string
          response_type?: string
          criteriaMatched?: string[]
          criteriaMissing?: string[]
        }
      }>
    } | null

    const allAttempts = evidence?.attempts || []
    const lastAttempt = allAttempts.at(-1)
    const mustInclude = actDef.verification?.success_criteria?.must_include ?? []

    return {
      index: idx + 1,
      activityId: actDef.id,
      question: actDef.verification?.question ?? '(sin pregunta)',
      mustInclude,
      attempts: ap?.attempts ?? 0,
      tangentCount: ap?.tangentCount ?? 0,
      understandingLevel: lastAttempt?.analysis?.understanding_level || 'unknown',
      criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
      criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
      studentResponses: allAttempts.map(a => a.studentResponse).filter(Boolean) as string[],
    }
  })

  const prompt = `Analiza el desempeño de un estudiante en la lección "${lessonTitle}" (nota final: ${grade}/100).

ALCANCE DE LA LECCIÓN (lo único que se enseñó — NO inventes temas fuera de esto):

OBJECTIVE:
${lessonObjective}

KEY POINTS:
${lessonKeyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

Datos por actividad:
${activitySummaries.map((a) => `
Actividad ${a.index} (${a.activityId}):
- Pregunta de verificación: ${a.question}
- Criterios que se evaluaron (must_include):
${a.mustInclude.map((c, j) => `  ${j + 1}. ${c}`).join('\n')}
- Criterios CUMPLIDOS por el estudiante: ${a.criteriaMatched.join(' | ') || '(ninguno)'}
- Criterios FALTANTES: ${a.criteriaMissing.join(' | ') || '(ninguno)'}
- Nivel de comprensión: ${a.understandingLevel}
- Intentos: ${a.attempts} (tangentes: ${a.tangentCount})
- Respuestas del estudiante (en orden):
${a.studentResponses.map((r, j) => `  ${j + 1}. "${r}"`).join('\n') || '  (sin respuestas)'}
`).join('')}

REGLAS CRÍTICAS — LEER ANTES DE GENERAR:

1. ALCANCE DE LA RECOMENDACIÓN: Solo podés referirte a conceptos que estén en el OBJECTIVE, los KEY POINTS, o los must_include de las actividades de arriba. NO inventes temas avanzados (cálculos, fórmulas específicas, costos, normativas, equipos no mencionados, optimizaciones, métricas) por más relacionados que parezcan al tema general. Si el estudiante dominó todo lo enseñado, recomendá avanzar — no inventes huecos.

2. TOLERANCIA A ERRORES DE TRANSCRIPCIÓN DE VOZ: Las respuestas pueden venir de Whisper y contener homófonos. NO los menciones como DEBILIDADES — son artefactos técnicos, no fallas conceptuales. Si una palabra suena parecida a un término del tema, interpretala correctamente.

3. SUSTANTIVA, NO GENÉRICA: Cita criterios concretos del must_include y respuestas literales del estudiante. NO uses frases vacías como "necesita mejorar la comprensión" — sé específico.

Genera un reporte breve en español con este formato exacto:

FORTALEZAS:
• (2-3 puntos específicos — cita qué criterios cumplió y en qué actividad)

DEBILIDADES:
• (2-3 puntos específicos — cita qué criterios faltaron — SOLO dentro del alcance enseñado)

NIVEL DE COMPRENSIÓN: (Inicio/Proceso/Logrado/Destacado) — (1 línea justificando)

RECOMENDACIÓN:
(1-2 líneas — solo dentro del alcance. Si dominó todo, decí "Lista/o para avanzar a la siguiente lección". NO inventes próximos pasos fuera del temario.)

Sé conciso y específico.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const reportText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    if (reportText) {
      await prisma.lessonSession.update({
        where: { id: sessionId },
        data: { summaryText: reportText },
      })

      logger.info('lesson_report.generated', {
        sessionId,
        grade,
        reportLength: reportText.length,
        tokens: response.usage.output_tokens,
      })
    }
  } catch (error: unknown) {
    logger.error('lesson_report.error', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Check for sessions inactive 24h+ without a report and generate partial reports.
 * Called when instructor opens the course dashboard.
 */
export async function checkAndGeneratePartialReports(courseId: string): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Find incomplete sessions with 24h+ inactivity and no report
  const inactiveSessions = await prisma.lessonSession.findMany({
    where: {
      completedAt: null,
      summaryText: null,
      lastActivityAt: { lt: twentyFourHoursAgo },
      lesson: {
        courseId,
        isPublished: true,
      },
      isTest: false,
    },
    include: {
      user: { select: { name: true } },
      lesson: {
        select: { title: true, objective: true, keyPoints: true, contentJson: true },
      },
      activities: {
        select: {
          activityId: true,
          status: true,
          attempts: true,
          tangentCount: true,
          evidenceData: true,
        },
      },
    },
    take: 10, // Limit to 10 at a time to avoid timeout
  })

  let generated = 0

  for (const session of inactiveSessions) {
    const contentJson = session.lesson.contentJson as LessonContent | null
    const totalActivities = contentJson?.activities?.length || 0
    const completedActivities = session.activities.filter(a => a.status === 'COMPLETED')
    const hoursInactive = Math.round((Date.now() - session.lastActivityAt.getTime()) / 1000 / 60 / 60)

    // Build activity summaries from what we have. Lookup por activityId, no por idx.
    const activitySummaries = (contentJson?.activities || []).map((actDef, idx) => {
      const progress = session.activities.find(a => a.activityId === actDef.id)
      const evidence = progress?.evidenceData as {
        attempts?: Array<{
          studentResponse?: string
          analysis?: {
            understanding_level?: string
            criteriaMatched?: string[]
            criteriaMissing?: string[]
          }
        }>
      } | null

      const lastAttempt = evidence?.attempts?.at(-1)
      const mustInclude = actDef.verification?.success_criteria?.must_include ?? []

      return {
        index: idx + 1,
        activityId: actDef.id,
        question: actDef.verification?.question ?? '(sin pregunta)',
        mustInclude,
        status: progress?.status || 'NOT_STARTED',
        attempts: progress?.attempts || 0,
        understandingLevel: lastAttempt?.analysis?.understanding_level || 'N/A',
        criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
        criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
      }
    })

    const prompt = `Analiza el desempeño PARCIAL de un estudiante en la lección "${session.lesson.title}".
El estudiante completó ${completedActivities.length} de ${totalActivities} actividades y lleva ${hoursInactive} horas inactivo.

ALCANCE DE LA LECCIÓN (lo único que se enseñó):

OBJECTIVE:
${session.lesson.objective}

KEY POINTS:
${session.lesson.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

Datos por actividad:
${activitySummaries.map((a) => `
Actividad ${a.index} (${a.activityId}):
- Estado: ${a.status === 'COMPLETED' ? 'Completada' : a.status === 'IN_PROGRESS' ? 'En progreso' : 'No iniciada'}
- Pregunta: ${a.question}
- Criterios evaluados:
${a.mustInclude.map((c, j) => `  ${j + 1}. ${c}`).join('\n')}
- Cumplió: ${a.criteriaMatched.join(' | ') || '(ninguno)'}
- Faltó: ${a.criteriaMissing.join(' | ') || '(ninguno)'}
- Intentos: ${a.attempts}
- Nivel: ${a.understandingLevel}
`).join('')}

REGLA CRÍTICA — ALCANCE: Solo podés referirte a conceptos del OBJECTIVE, KEY POINTS o must_include de arriba. NO inventes temas avanzados fuera del alcance.

Genera un reporte PARCIAL breve en español con este formato exacto:

⚠️ REPORTE PARCIAL — Sesión incompleta (${completedActivities.length}/${totalActivities} actividades, ${hoursInactive}h inactivo)

COMPLETÓ:
• (listar actividades completadas con nivel de comprensión)

NO COMPLETÓ:
• (listar actividades pendientes)

POSIBLE CAUSA DE ABANDONO:
(1-2 líneas analizando dónde se quedó y por qué pudo abandonar, basándote en intentos y criterios faltantes)

RECOMENDACIÓN:
(1-2 líneas: contactar al estudiante, qué reforzar — solo dentro del alcance)

Sé conciso y específico.`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      })

      const reportText = response.content[0].type === 'text'
        ? response.content[0].text
        : ''

      if (reportText) {
        await prisma.lessonSession.update({
          where: { id: session.id },
          data: { summaryText: reportText },
        })
        generated++

        logger.info('lesson_report.partial_generated', {
          sessionId: session.id,
          studentName: session.user.name,
          completedActivities: completedActivities.length,
          totalActivities,
          hoursInactive,
        })
      }
    } catch (error: unknown) {
      logger.error('lesson_report.partial_error', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return generated
}
