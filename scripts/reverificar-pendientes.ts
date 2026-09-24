/**
 * Re-verifica los intentos que quedaron SIN nivel porque el verificador no
 * respondió en el momento (API caída, JSON inválido).
 *
 * Desde el 14 set 2026, cuando el verificador falla el alumno avanza igual pero
 * el intento se guarda con `unverified: true`, sin nivel ni criterios, y la
 * actividad con aiFeedback «Sin verificar…». Ese intento no puntúa ni aparece
 * como evaluado hasta que este script lo pase de nuevo por el verificador
 * sobre la respuesta guardada, con el historial de esa actividad como contexto.
 *
 * Por defecto solo muestra qué haría. Con --aplicar escribe la evidencia, el
 * passedCriteria y, si la sesión ya cerró, recalcula su nota.
 *
 *   npx tsx scripts/reverificar-pendientes.ts            # solo mostrar
 *   npx tsx scripts/reverificar-pendientes.ts --aplicar  # escribir
 *   npx tsx scripts/reverificar-pendientes.ts --limite=20
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { verifyActivityCompletion } from '../lib/activity-verification'
import { notaDeLaSesion } from '../lib/grading'
import { isPassing } from '../lib/rubric'
import type { ActivityCompletionResult, LessonContent } from '../types/lesson'

type Intento = {
  studentResponse?: string
  analysis?: Record<string, unknown> & { unverified?: boolean }
  timestamp?: string
}
type Evidencia = { attempts?: Intento[]; wasExplained?: boolean; scaffoldingTurns?: number }

const aplicar = process.argv.includes('--aplicar')
const limite = Number(
  (process.argv.find((a) => a.startsWith('--limite=')) ?? '--limite=50').split('=')[1]
)

async function main() {
  const pendientes = await prisma.activityProgress.findMany({
    where: { aiFeedback: { startsWith: 'Sin verificar' } },
    orderBy: { completedAt: 'asc' },
    take: limite,
    include: {
      lessonSession: {
        select: {
          id: true,
          completedAt: true,
          user: { select: { name: true, email: true } },
          lesson: {
            select: { id: true, title: true, contentJson: true, course: { select: { methodology: true } } },
          },
        },
      },
    },
  })

  console.log(`${pendientes.length} actividad(es) sin verificar${aplicar ? '' : ' (solo mostrar; usa --aplicar para escribir)'}\n`)

  let reverificadas = 0
  let siguenCaidas = 0

  for (const p of pendientes) {
    const contenido = p.lessonSession.lesson.contentJson as LessonContent | null
    const actividad = contenido?.activities.find((a) => a.id === p.activityId)
    const quien = p.lessonSession.user.name ?? p.lessonSession.user.email
    console.log(`— ${quien} · ${p.lessonSession.lesson.title} · ${p.activityId}`)
    if (!actividad) {
      console.log('   la actividad ya no está en el plan; se omite')
      continue
    }

    const evidencia = ((p.evidenceData as Evidencia | null) ?? { attempts: [] })
    const historial = (
      await prisma.message.findMany({
        where: { sessionId: p.lessonSessionId, activityId: p.activityId },
        orderBy: { timestamp: 'asc' },
        select: { role: true, content: true },
      })
    ).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let ultimo: ActivityCompletionResult | null = null
    for (const intento of evidencia.attempts ?? []) {
      if (!intento.analysis?.unverified || !intento.studentResponse) continue
      const r = await verifyActivityCompletion(
        intento.studentResponse,
        actividad,
        historial,
        evidencia.wasExplained === true
      )
      if (r.unverified) {
        siguenCaidas++
        console.log('   el verificador sigue sin responder; queda pendiente')
        continue
      }
      intento.analysis = {
        ...intento.analysis,
        ready_to_advance: r.ready_to_advance,
        completed: r.completed,
        criteriaMatched: r.criteriaMatched,
        criteriaMissing: r.criteriaMissing,
        understanding_level: r.understanding_level,
        response_type: r.response_type,
        completeness_percentage: r.completeness_percentage,
        student_intent: r.student_intent,
        unverified: false,
        reverificadoEn: new Date().toISOString(),
      }
      ultimo = r
      console.log(
        `   «${intento.studentResponse.slice(0, 60)}…» → ${r.understanding_level} · ${r.completeness_percentage} % · cumple ${r.criteriaMatched.length}/${actividad.verification.success_criteria?.must_include.length ?? 0}`
      )
    }

    if (!ultimo) continue
    reverificadas++
    if (!aplicar) continue

    await prisma.activityProgress.update({
      where: { id: p.id },
      data: {
        evidenceData: evidencia as Prisma.InputJsonValue,
        passedCriteria: ultimo.completed,
        aiFeedback: ultimo.feedback || 'Re-verificado sobre la respuesta guardada.',
      },
    })

    // Sesión ya cerrada: su nota se calculó sin esta actividad. Se recalcula.
    if (p.lessonSession.completedAt && contenido) {
      const todas = await prisma.activityProgress.findMany({
        where: { lessonSessionId: p.lessonSessionId, status: 'COMPLETED' },
        select: { activityId: true, attempts: true, tangentCount: true, evidenceData: true, passedCriteria: true },
      })
      const grade = notaDeLaSesion(contenido.activities, todas, p.lessonSession.lesson.course?.methodology)
      await prisma.lessonSession.update({
        where: { id: p.lessonSessionId },
        data: { grade, passed: grade !== null && isPassing(grade) },
      })
      console.log(`   nota de la sesión recalculada: ${grade ?? 'sin nota'}`)
    }
  }

  console.log(`\nre-verificadas: ${reverificadas} · siguen sin verificar: ${siguenCaidas}${aplicar ? '' : ' · nada escrito'}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
