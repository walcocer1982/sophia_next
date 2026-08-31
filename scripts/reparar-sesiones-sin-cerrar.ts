/**
 * Repara las sesiones que terminaron pero nunca se cerraron.
 *
 * Causa: el avance forzado a los 5 intentos marcaba la última actividad como
 * completada y, al no encontrar una siguiente, no calculaba nota ni ponía
 * `completedAt`. Corregido en app/api/chat/stream/route.ts (cerrarLeccion).
 * Este script arregla las que ya quedaron rotas.
 *
 * Usa la MISMA fórmula que el cierre en vivo — si divergieran, las notas
 * retroactivas no serían comparables con las nuevas.
 *
 *   npx tsx scripts/reparar-sesiones-sin-cerrar.ts          (simulación)
 *   npx tsx scripts/reparar-sesiones-sin-cerrar.ts --aplicar
 */
import { prisma } from '../lib/prisma'
import { calculateGrade, calculateCompletionGrade } from '../lib/grading'
import { isPassing } from '../lib/rubric'

const aplicar = process.argv.includes('--aplicar')

async function main() {
  const sesiones = await prisma.lessonSession.findMany({
    where: { completedAt: null, isTest: false },
    select: {
      id: true,
      user: { select: { name: true } },
      lesson: {
        select: { title: true, contentJson: true, course: { select: { methodology: true } } },
      },
      activities: {
        where: { status: 'COMPLETED' },
        select: { activityId: true, attempts: true, tangentCount: true, evidenceData: true, passedCriteria: true },
      },
    },
  })

  const reparables = sesiones.filter((s) => {
    const acts = (s.lesson.contentJson as { activities?: { id: string }[] } | null)?.activities ?? []
    return acts.length > 0 && s.activities.length >= acts.length
  })

  console.log(`Sesiones sin cerrar: ${sesiones.length} · con TODAS las actividades hechas: ${reparables.length}\n`)

  let ok = 0
  let sinNota = 0
  for (const s of reparables) {
    const acts = (s.lesson.contentJson as { activities: { id: string; verification?: { is_evaluative?: boolean } }[] }).activities

    const evaluativa = new Map<string, boolean>()
    for (const a of acts) evaluativa.set(a.id, a.verification?.is_evaluative !== false)

    const evaluables = s.activities.filter((ap) => evaluativa.get(ap.activityId) !== false)
    const totalEvaluables = [...evaluativa.values()].filter(Boolean).length

    // Sin mérito en NINGUNA actividad = avanzó por límite de intentos en todas.
    // Esas sesiones no llevan nota: su evidencia de junio guarda `applied` con
    // completitud 0 en cada intento, y la fórmula lo traduce a 75 («Logrado»).
    // Sería regalar un aprobado a quien no resolvió un solo criterio — y en
    // tutoría, que es precisamente donde están los alumnos de bajo desempeño.
    const conMerito = s.activities.some((ap) => ap.passedCriteria)

    if (!conMerito) {
      console.log(
        `${(s.user.name ?? '').slice(0, 26).padEnd(28)} ${s.lesson.title.slice(0, 26).padEnd(28)} SIN NOTA · avanzó por límite en todo`
      )
      if (aplicar) {
        await prisma.lessonSession.update({
          where: { id: s.id },
          data: { completedAt: new Date(), passed: false, progress: 100, grade: null },
        })
        sinNota++
      }
      continue
    }

    const grade =
      s.lesson.course?.methodology === 'CODE'
        ? calculateCompletionGrade(evaluables.length, totalEvaluables)
        : calculateGrade(evaluables)

    console.log(
      `${(s.user.name ?? '').slice(0, 26).padEnd(28)} ${s.lesson.title.slice(0, 26).padEnd(28)} nota ${String(Math.round(grade)).padStart(3)} ${isPassing(grade) ? 'aprobó' : 'desaprobó'}`
    )

    if (aplicar) {
      await prisma.lessonSession.update({
        where: { id: s.id },
        data: { completedAt: new Date(), passed: isPassing(grade), progress: 100, grade },
      })
      ok++
    }
  }

  console.log(
    aplicar
      ? `\nCerradas: ${ok}. No se generaron informes de sesión: son de hace semanas y el informe se escribe con el contexto del momento.`
      : `\nSimulación. Para aplicar: npx tsx scripts/reparar-sesiones-sin-cerrar.ts --aplicar`
  )
}

main().finally(() => prisma.$disconnect())
