/**
 * Diagnóstico: explica la nota final de un participante del kiosko.
 * Uso: npx tsx scripts/explain-grade.ts [CODE]   (default V77XUV)
 */
import { prisma } from '../lib/prisma'
import { activityScore, COMPREHENSION_SCORES, calculateGrade } from '../lib/grading'
import { normalizeLevel, LEVEL_LABEL_ES } from '../lib/levels'

async function main() {
  const code = (process.argv[2] || 'V77XUV').toUpperCase()
  const assessment = await prisma.assessment.findUnique({
    where: { code },
    select: { id: true, lessonId: true, lesson: { select: { contentJson: true } } },
  })
  if (!assessment) { console.error('no assessment'); process.exit(1) }

  // Participante más reciente
  const participant = await prisma.assessmentParticipant.findFirst({
    where: { assessmentId: assessment.id },
    orderBy: { startedAt: 'desc' },
    select: { firstName: true, gradeOver20: true, passed: true, sessionId: true },
  })
  if (!participant) { console.error('no participant'); process.exit(1) }

  const activities = await prisma.activityProgress.findMany({
    where: { lessonSessionId: participant.sessionId ?? '' },
  })

  const content = assessment.lesson.contentJson as { activities?: Array<{ id: string; verification?: { is_evaluative?: boolean; question?: string; success_criteria?: { must_include?: string[] } } }> }
  const lessonActs = content.activities || []
  const totalEvaluative = lessonActs.filter(a => a.verification?.is_evaluative !== false).length

  console.log(`\n👤 ${participant.firstName}  ·  nota guardada: ${participant.gradeOver20}/20  ·  passed: ${participant.passed}`)
  console.log(`   Actividades evaluativas esperadas: ${totalEvaluative}\n`)

  const scorables: { attempts: number; tangentCount?: number | null; evidenceData: unknown }[] = []
  for (const la of lessonActs) {
    const ap = activities.find(a => a.activityId === la.id)
    const evidence = ap?.evidenceData as { attempts?: Array<{ studentResponse?: string; analysis?: { understanding_level?: string; criteriaMatched?: string[]; criteriaMissing?: string[]; completeness_percentage?: number } }> } | null
    const attemptsArr = evidence?.attempts || []
    const sc = ap ? activityScore({ attempts: ap.attempts, tangentCount: ap.tangentCount, evidenceData: ap.evidenceData }) : 0

    console.log('═'.repeat(90))
    console.log(`❓ PREGUNTA: ${la.verification?.question || '(sin pregunta)'}`)
    console.log(`   criterios: ${(la.verification?.success_criteria?.must_include || []).map((c, i) => `[${i}] ${c}`).join(' | ')}`)
    attemptsArr.forEach((t, i) => {
      const lvl = normalizeLevel(t.analysis?.understanding_level)
      console.log(`   ── intento ${i + 1}:`)
      console.log(`      💬 "${(t.studentResponse || '').slice(0, 200)}"`)
      console.log(`      → ${LEVEL_LABEL_ES[lvl]} (${COMPREHENSION_SCORES[lvl]}) · ${t.analysis?.completeness_percentage ?? '?'}% · cumple: [${(t.analysis?.criteriaMatched || []).join('; ') || '—'}]`)
    })
    console.log(`   📊 score actividad (con penalties): ${sc}/100`)
    if (la.verification?.is_evaluative !== false) {
      scorables.push({ attempts: ap?.attempts ?? 0, tangentCount: ap?.tangentCount, evidenceData: ap?.evidenceData ?? null })
    }
  }

  const grade100 = calculateGrade(scorables, totalEvaluative)
  console.log('\n' + '═'.repeat(90))
  console.log(`🧮 Promedio sobre ${totalEvaluative} actividades = ${grade100}/100 → ${(grade100 / 100 * 20).toFixed(1)}/20`)

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
