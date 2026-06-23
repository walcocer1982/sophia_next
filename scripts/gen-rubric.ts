/**
 * Fase A/B — Generador de rúbrica.
 *
 * Genera las referencias por nivel + pistas para las actividades de una lección.
 * Por defecto solo IMPRIME (revisión). Con --write, persiste la rúbrica en el
 * contentJson de la lección (mutación mínima: agrega rubric + scaffold_hints a
 * cada verification; no toca el resto de la estructura).
 *
 * Uso:
 *   npx tsx scripts/gen-rubric.ts [CODE]            → genera e imprime
 *   npx tsx scripts/gen-rubric.ts [CODE] --write    → genera y guarda en DB
 */

import { prisma } from '../lib/prisma'
import { generateActivityRubric } from '../lib/rubric-generator'
import type { Activity } from '../types/lesson'

// Forma cruda mínima del contentJson que nos interesa mutar
type RawContent = { activities?: Activity[] }

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const code = (args.find((a) => !a.startsWith('--')) || 'V77XUV').toUpperCase()

  const assessment = await prisma.assessment.findUnique({
    where: { code },
    select: { lesson: { select: { id: true, title: true, contentJson: true } } },
  })

  if (!assessment?.lesson?.contentJson) {
    console.error(`No se encontró lección para el código ${code}`)
    process.exit(1)
  }

  // Trabajamos sobre el objeto CRUDO para preservar la forma original al escribir.
  const raw = assessment.lesson.contentJson as RawContent
  const activities = raw.activities || []

  console.log(`\n📘 Lección: ${assessment.lesson.title}`)
  console.log(`   Actividades: ${activities.length}   Modo: ${write ? 'ESCRITURA' : 'solo imprimir'}\n`)

  let okCount = 0
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i]
    const criteria = act.verification.success_criteria?.must_include || []
    console.log('═'.repeat(80))
    console.log(`ACTIVIDAD ${i + 1}/${activities.length}  (id: ${act.id})`)
    console.log(`PREGUNTA: ${act.verification.question}`)

    try {
      const { rubric, scaffold_hints } = await generateActivityRubric(act)
      console.log(`  🔴 ${rubric.beginning}`)
      console.log(`  🟡 ${rubric.developing}`)
      console.log(`  🟢 ${rubric.achieved}`)
      console.log(`  ⭐ ${rubric.outstanding}`)
      console.log(`  pistas: ${scaffold_hints.length} (criterios: ${criteria.length})`)

      // Mutación mínima sobre el objeto crudo
      act.verification.rubric = rubric
      act.verification.scaffold_hints = scaffold_hints
      okCount++
    } catch (e) {
      console.error(`  ❌ Error: ${e instanceof Error ? e.message : e}`)
    }
    console.log('')
  }

  if (write) {
    if (okCount !== activities.length) {
      console.error(`⚠️  No se escribe: solo ${okCount}/${activities.length} actividades OK. Reintentá.`)
    } else {
      await prisma.lesson.update({
        where: { id: assessment.lesson.id },
        data: { contentJson: raw as object },
      })
      console.log(`✅ Rúbrica guardada en la lección (${okCount} actividades).`)
    }
  } else {
    console.log(`(modo lectura — usá --write para guardar)`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
