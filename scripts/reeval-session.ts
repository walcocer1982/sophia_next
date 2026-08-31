/**
 * Re-evalúa las respuestas de una sesión con el verifier ACTUAL del código.
 * Útil para validar fixes en el prompt (causa #12 — escalación de levels)
 * sin afectar la sesión real en DB.
 *
 * Muestra: cada respuesta + nivel actual (DB) vs nivel re-evaluado, y
 * recalcula la nota final con el grader nuevo (que considera la lógica
 * actualizada de causa #13 — scaffolding ignorado para attempts).
 *
 * Uso: npx tsx scripts/reeval-session.ts "Nombre del participante"
 *      npx tsx scripts/reeval-session.ts <sessionId>
 */
import { prisma } from '../lib/prisma'
import { verifyActivityCompletion } from '../lib/activity-verification'
import { calculateGrade } from '../lib/grading'
import type { LessonContent, Activity } from '../types/lesson'

async function main() {
  const query = process.argv[2]
  if (!query) {
    console.error('Uso: npx tsx scripts/reeval-session.ts "Nombre" | <sessionId>')
    process.exit(1)
  }

  const session = await prisma.lessonSession.findFirst({
    where: {
      OR: [
        { id: query },
        {
          assessmentParticipant: {
            OR: [
              { firstName: { contains: query.split(' ')[0], mode: 'insensitive' } },
              { lastName: { contains: query.split(' ').slice(1).join(' '), mode: 'insensitive' } },
            ],
          },
        },
      ],
    },
    include: {
      lesson: { select: { title: true, objective: true, keyPoints: true, contentJson: true, course: { select: { instructor: true } } } },
      activities: { select: { activityId: true, status: true, attempts: true, tangentCount: true, evidenceData: true } },
      messages: { orderBy: { timestamp: 'asc' }, select: { role: true, content: true, activityId: true } },
      assessmentParticipant: { select: { firstName: true, lastName: true, grade: true, gradeOver20: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!session) {
    console.log('Sin sesión')
    return
  }

  const contentJson = session.lesson.contentJson as unknown as LessonContent
  const activities = contentJson.activities ?? []

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🔬 RE-EVALUACIÓN: ${session.assessmentParticipant?.firstName ?? session.userId}`)
  console.log(`📚 ${session.lesson.title}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Reconstruir conversación por actividad
  type Turn = { studentResponse: string; activityId: string }
  const turnsByActivity = new Map<string, string[]>()
  for (const m of session.messages) {
    if (m.role === 'user' && m.activityId) {
      const arr = turnsByActivity.get(m.activityId) ?? []
      arr.push(m.content)
      turnsByActivity.set(m.activityId, arr)
    }
  }

  // Para cada actividad: re-evaluar cada respuesta del estudiante con el verifier actual
  const newEvidence: Array<{
    activityId: string
    activity: Activity
    attempts: Array<{ studentResponse: string; analysis: { understanding_level: string; criteriaMatched: string[]; criteriaMissing: string[] } }>
    tangentCount: number
  }> = []

  for (const act of activities) {
    const responses = turnsByActivity.get(act.id) ?? []
    if (responses.length === 0) continue

    console.log(`\n📖 ${act.id}`)
    console.log(`   Pregunta: ${act.verification?.question?.slice(0, 100)}`)
    console.log(`   must_include (${act.verification?.success_criteria?.must_include?.length || 0}):`)
    for (const c of act.verification?.success_criteria?.must_include ?? []) {
      console.log(`     - ${c}`)
    }

    // Estado anterior (del DB)
    const oldAp = session.activities.find((a) => a.activityId === act.id)
    const oldEv = oldAp?.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
    const oldLastLevel = oldEv?.attempts?.at(-1)?.analysis?.understanding_level ?? '?'
    console.log(`\n   Estado DB actual: ${oldAp?.attempts ?? 0} attempts, último nivel: ${oldLastLevel}`)

    // Re-evaluar cada respuesta
    const newAttempts: typeof newEvidence[number]['attempts'] = []
    for (const [idx, r] of responses.entries()) {
      try {
        const verification = await verifyActivityCompletion(r, act, undefined, false)
        console.log(`\n   [${idx + 1}] "${r.slice(0, 80)}${r.length > 80 ? '…' : ''}"`)
        console.log(`       nivel: ${verification.understanding_level}  |  ready: ${verification.ready_to_advance}  |  needs_scaffolding: ${verification.needs_scaffolding}`)
        console.log(`       cumplió: ${verification.criteriaMatched.join(' | ') || '(ninguno)'}`)
        if (verification.criteriaMissing.length > 0) {
          console.log(`       faltó: ${verification.criteriaMissing.join(' | ')}`)
        }
        newAttempts.push({
          studentResponse: r,
          analysis: {
            understanding_level: verification.understanding_level,
            criteriaMatched: verification.criteriaMatched,
            criteriaMissing: verification.criteriaMissing,
          },
        })
      } catch (e) {
        console.log(`   [${idx + 1}] ERROR re-evaluating: ${e}`)
      }
    }

    newEvidence.push({
      activityId: act.id,
      activity: act,
      attempts: newAttempts,
      tangentCount: oldAp?.tangentCount ?? 0,
    })
  }

  // Calcular nota nueva con el grader actual
  // El grader espera evidenceData en formato { attempts: [...] }
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 RESULTADO RE-EVALUADO`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  const scorable = newEvidence.map((e) => ({
    attempts: e.attempts.length,
    tangentCount: e.tangentCount,
    evidenceData: { attempts: e.attempts },
  }))

  const newGrade = calculateGrade(scorable)
  const oldGrade = session.assessmentParticipant?.grade ?? 0

  console.log(`Nota anterior:    ${oldGrade}/100`)
  console.log(`Nota re-evaluada: ${newGrade}/100`)
  const delta = (newGrade ?? 0) - oldGrade
  console.log(`Delta:            ${delta > 0 ? '+' : ''}${delta} puntos`)
  if (delta >= 20) console.log(`✅ El fix mejoró la nota significativamente`)
  else if (delta > 0) console.log(`🟡 Mejora moderada`)
  else if (delta === 0) console.log(`⏸️  Sin cambios (el verifier original ya estaba bien)`)
  else console.log(`⚠️  La nota bajó — revisar prompt`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
