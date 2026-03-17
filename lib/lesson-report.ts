import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

interface ActivityData {
  attempts: number
  tangentCount: number
  evidenceData: unknown
}

/**
 * Generate an AI report summarizing the student's performance on a lesson.
 * Called asynchronously after lesson completion — does not block the response.
 */
export async function generateLessonReport(
  sessionId: string,
  lessonTitle: string,
  activities: ActivityData[],
  grade: number,
  contentJson: LessonContent
): Promise<void> {
  // Build summary of student performance per activity
  const activitySummaries = activities.map((ap, idx) => {
    const evidence = ap.evidenceData as {
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

    const actDef = contentJson.activities?.[idx]
    const title = actDef?.teaching?.agent_instruction?.slice(0, 80) || `Actividad ${idx + 1}`
    const allAttempts = evidence?.attempts || []
    const lastAttempt = allAttempts.at(-1)

    return {
      title,
      attempts: ap.attempts,
      tangentCount: ap.tangentCount,
      understandingLevel: lastAttempt?.analysis?.understanding_level || 'unknown',
      criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
      criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
      studentResponses: allAttempts.map(a => a.studentResponse?.slice(0, 150)).filter(Boolean),
    }
  })

  const prompt = `Analiza el desempeño de un estudiante en la lección "${lessonTitle}" (nota final: ${grade}/100).

Datos por actividad:
${activitySummaries.map((a, i) => `
Actividad ${i + 1}: ${a.title}
- Intentos: ${a.attempts}
- Tangentes: ${a.tangentCount}
- Nivel comprensión: ${a.understandingLevel}
- Criterios cumplidos: ${a.criteriaMatched.join(', ') || 'N/A'}
- Criterios faltantes: ${a.criteriaMissing.join(', ') || 'Ninguno'}
- Respuestas del estudiante: ${a.studentResponses.join(' | ') || 'N/A'}
`).join('')}

Genera un reporte breve en español con este formato exacto:

FORTALEZAS:
• (2-3 puntos específicos basados en las respuestas)

DEBILIDADES:
• (2-3 puntos específicos, mencionar actividades donde tuvo dificultad)

NIVEL DE COMPRENSIÓN: (memorizado/comprendido/aplicado/analizado) — (explicación de 1 línea)

RECOMENDACIÓN:
(1-2 líneas sobre qué reforzar y si puede avanzar a temas más complejos)

Sé conciso y específico. No uses lenguaje genérico.`

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
        select: { title: true, contentJson: true },
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

    // Build activity summaries from what we have
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
      const title = actDef.teaching?.agent_instruction?.slice(0, 80) || `Actividad ${idx + 1}`

      return {
        title,
        status: progress?.status || 'NOT_STARTED',
        attempts: progress?.attempts || 0,
        understandingLevel: lastAttempt?.analysis?.understanding_level || 'N/A',
        criteriaMatched: lastAttempt?.analysis?.criteriaMatched || [],
        criteriaMissing: lastAttempt?.analysis?.criteriaMissing || [],
      }
    })

    const prompt = `Analiza el desempeño PARCIAL de un estudiante en la lección "${session.lesson.title}".
El estudiante completó ${completedActivities.length} de ${totalActivities} actividades y lleva ${hoursInactive} horas inactivo.

Datos por actividad:
${activitySummaries.map((a, i) => `
Actividad ${i + 1}: ${a.title}
- Estado: ${a.status === 'COMPLETED' ? 'Completada' : a.status === 'IN_PROGRESS' ? 'En progreso' : 'No iniciada'}
- Intentos: ${a.attempts}
- Nivel comprensión: ${a.understandingLevel}
- Criterios cumplidos: ${a.criteriaMatched.join(', ') || 'N/A'}
- Criterios faltantes: ${a.criteriaMissing.join(', ') || 'N/A'}
`).join('')}

Genera un reporte PARCIAL breve en español con este formato exacto:

⚠️ REPORTE PARCIAL — Sesión incompleta (${completedActivities.length}/${totalActivities} actividades, ${hoursInactive}h inactivo)

COMPLETÓ:
• (listar actividades completadas con nivel de comprensión)

NO COMPLETÓ:
• (listar actividades pendientes)

POSIBLE CAUSA DE ABANDONO:
(1-2 líneas analizando dónde se quedó y por qué pudo abandonar, basándote en intentos y criterios faltantes)

RECOMENDACIÓN:
(1-2 líneas: contactar al estudiante, qué reforzar)

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
