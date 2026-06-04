/**
 * Diagnóstico: por qué el reporte recomienda temas fuera del alcance.
 * Compara lo que el modelo de reporte VIO (input) vs lo que GENERÓ (output),
 * contra lo que REALMENTE definía la lección (success_criteria, keyPoints).
 *
 * Uso: npx tsx scripts/debug-report-causes.ts "María Céspedes"
 */

import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

async function main() {
  const query = process.argv[2]
  if (!query) {
    console.error('Uso: npx tsx scripts/debug-report-causes.ts "Nombre"')
    process.exit(1)
  }

  const session = await prisma.lessonSession.findFirst({
    where: {
      assessmentParticipant: {
        firstName: { contains: query.split(' ')[0], mode: 'insensitive' },
      },
    },
    include: {
      lesson: { select: { title: true, objective: true, keyPoints: true, contentJson: true } },
      activities: {
        select: {
          activityId: true,
          status: true,
          attempts: true,
          tangentCount: true,
          evidenceData: true,
        },
      },
      assessmentParticipant: { select: { firstName: true, lastName: true, grade: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!session) {
    console.log('Sin sesión')
    return
  }

  const contentJson = session.lesson.contentJson as unknown as LessonContent

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🔍 DIAGNÓSTICO: ${session.assessmentParticipant?.firstName} ${session.assessmentParticipant?.lastName ?? ''}`)
  console.log(`📚 ${session.lesson.title} (nota ${session.assessmentParticipant?.grade}/100)`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // 1) Lo que la lección DEFINE como alcance
  console.log(`🎯 OBJECTIVE de la lección (verdad fuente del alcance):`)
  console.log(`   "${session.lesson.objective}"\n`)

  console.log(`🔑 KEY POINTS de la lección (lo que SE ENSEÑA):`)
  session.lesson.keyPoints.forEach((kp, i) => console.log(`   ${i + 1}. ${kp}`))
  console.log()

  console.log(`📋 SUCCESS_CRITERIA por actividad (lo que el estudiante debía cumplir):`)
  console.log(`   Estos son los ÚNICOS conceptos por los que se evaluó.\n`)

  contentJson.activities?.forEach((act, i) => {
    const criteria = act.verification?.success_criteria?.must_include ?? []
    const hints = act.verification?.success_criteria?.hints?.key_concepts ?? []
    console.log(`   Act ${i + 1} (${act.id}):`)
    console.log(`     question: ${act.verification?.question?.slice(0, 100) ?? '(sin pregunta)'}`)
    console.log(`     must_include (${criteria.length}):`)
    criteria.forEach((c, j) => console.log(`       ${j + 1}. ${c}`))
    if (hints.length > 0) {
      console.log(`     key_concepts hints: ${hints.join(' | ')}`)
    }
    console.log()
  })

  // 2) Lo que el reporte VIO (input al modelo)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📥 LO QUE EL MODELO DE REPORTE VIO (input)`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   ❌ NO recibió: objective, keyPoints, must_include completos`)
  console.log(`   ✅ Sí recibió: lesson title, agent_instruction truncado (80 chars), criteria matched/missing strings, respuestas truncadas (150 chars)\n`)

  console.log(`Reconstrucción exacta del input por actividad:\n`)
  session.activities.forEach((ap, idx) => {
    const ev = ap.evidenceData as {
      attempts?: Array<{
        studentResponse?: string
        analysis?: {
          understanding_level?: string
          criteriaMatched?: string[]
          criteriaMissing?: string[]
        }
      }>
    } | null

    const actDef = contentJson.activities?.[idx]
    const truncatedTitle = actDef?.teaching?.agent_instruction?.slice(0, 80) || `Actividad ${idx + 1}`
    const lastAtt = ev?.attempts?.at(-1)

    console.log(`Actividad ${idx + 1}: ${truncatedTitle}`)
    console.log(`  Intentos: ${ap.attempts}`)
    console.log(`  Tangentes: ${ap.tangentCount}`)
    console.log(`  Nivel comprensión: ${lastAtt?.analysis?.understanding_level || 'unknown'}`)
    console.log(`  Criterios cumplidos: ${lastAtt?.analysis?.criteriaMatched?.join(', ') || 'N/A'}`)
    console.log(`  Criterios faltantes: ${lastAtt?.analysis?.criteriaMissing?.join(', ') || 'Ninguno'}`)
    const respuestas = (ev?.attempts || []).map(a => a.studentResponse?.slice(0, 150)).filter(Boolean)
    console.log(`  Respuestas del estudiante:`)
    respuestas.forEach((r, j) => console.log(`     ${j + 1}. "${r}"`))
    console.log()
  })

  // 3) Lo que el reporte GENERÓ
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📤 LO QUE EL MODELO GENERÓ`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  console.log(session.summaryText || '(sin reporte)')
  console.log()

  // 4) Comparación: ¿qué temas del reporte NO están en el alcance?
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🚨 ANÁLISIS DE CAUSAS`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Construir el universo de palabras válidas en el alcance
  const scope = [
    session.lesson.objective,
    ...session.lesson.keyPoints,
    ...(contentJson.activities ?? []).flatMap(a => [
      ...(a.verification?.success_criteria?.must_include ?? []),
      ...(a.verification?.success_criteria?.hints?.key_concepts ?? []),
      a.verification?.question ?? '',
    ]),
  ].join(' ').toLowerCase()

  const reportLower = (session.summaryText || '').toLowerCase()

  // Palabras candidatas a "fuera de alcance" — temas técnicos comunes que el AI
  // podría inventar si no está restringido
  const candidatosFueraDeAlcance = [
    'costo', 'precio', 'inversión', 'rentabilidad',
    'tonelada', 'productividad', 'rendimiento',
    'malla', 'geometría', 'taladros',
    'tipo de explosivo', 'detonante', 'anfo', 'dinamita',
    'fórmula', 'ecuación', 'cálculo',
    'normativa', 'regulación', 'osinergmin',
    'eficiencia', 'optimización',
  ]

  const inventados = candidatosFueraDeAlcance.filter(w =>
    reportLower.includes(w) && !scope.includes(w)
  )

  console.log(`📌 CAUSA 1 — Prompt sin contexto de alcance`)
  console.log(`   El prompt NO envía objective ni keyPoints, así que el modelo no`)
  console.log(`   tiene forma de saber qué es "dentro del alcance" de la lección.`)
  console.log(`   Termina usando su conocimiento general del tema.\n`)

  console.log(`📌 CAUSA 2 — agent_instruction truncado a 80 chars`)
  console.log(`   Las "actividades" que ve el modelo son frases mochas:`)
  contentJson.activities?.forEach((act, i) => {
    const trunc = act.teaching?.agent_instruction?.slice(0, 80) || ''
    const full = act.teaching?.agent_instruction || ''
    if (full.length > 80) {
      console.log(`   Act ${i + 1}: "${trunc}…" (real: ${full.length} chars)`)
    }
  })
  console.log()

  console.log(`📌 CAUSA 3 — criteriaMatched/Missing son strings sueltas, sin contexto`)
  console.log(`   El modelo ve "cumplió: X, Y" pero no sabe contra qué set total se`)
  console.log(`   compara. No sabe si X es 1 de 3 o 1 de 10 criterios.\n`)

  console.log(`📌 CAUSA 4 — solo se loguea el ÚLTIMO intento`)
  console.log(`   evidenceData.attempts.at(-1) — si el estudiante mejoró del intento`)
  console.log(`   1 al 4, el modelo solo ve el 4to. Pierde el patrón de progresión.\n`)

  console.log(`📌 CAUSA 5 — respuestas truncadas a 150 chars`)
  console.log(`   El modelo no ve la respuesta completa, así que puede malinterpretar`)
  console.log(`   o asumir que falta detalle que sí existía.\n`)

  console.log(`📌 CAUSA 6 — el prompt pide "si puede avanzar a temas más complejos"`)
  console.log(`   Esa frase EMPUJA al modelo a inventar "próximos pasos" aunque no`)
  console.log(`   existan en el alcance. Es un sesgo del propio prompt.\n`)

  console.log(`📌 CAUSA 7 — modelo Haiku 4.5 (no Sonnet)`)
  console.log(`   Haiku es más propenso a confabulación cuando le falta contexto.`)
  console.log(`   Con menos restricciones, rellena con sentido común del dominio.\n`)

  if (inventados.length > 0) {
    console.log(`🎯 EVIDENCIA DIRECTA — Palabras en el reporte que NO están en el alcance:`)
    inventados.forEach(w => console.log(`   • "${w}"`))
    console.log()
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
