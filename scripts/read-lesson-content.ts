/**
 * Imprime el contentJson actual de una lección para inspección o refactor.
 * Uso: npx tsx scripts/read-lesson-content.ts "El ciclo de minado"
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

async function main() {
  const title = process.argv[2]
  if (!title) {
    console.error('Uso: npx tsx scripts/read-lesson-content.ts "Título de la lección"')
    process.exit(1)
  }

  const lesson = await prisma.lesson.findFirst({
    where: { title: { contains: title, mode: 'insensitive' } },
    select: { id: true, title: true, objective: true, keyPoints: true, contentJson: true },
  })

  if (!lesson) {
    console.log('Sin lección')
    return
  }

  const content = lesson.contentJson as unknown as LessonContent

  console.log(`\n📚 ${lesson.title}`)
  console.log(`🆔 ${lesson.id}\n`)
  console.log(`🎯 Objective:\n   ${lesson.objective}\n`)
  console.log(`🔑 Key Points:`)
  lesson.keyPoints.forEach((kp, i) => console.log(`   ${i + 1}. ${kp}`))
  console.log()

  content.activities?.forEach((act, i) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Actividad ${i + 1} — ${act.id}`)
    console.log(`Tipo: ${act.type}, complexity: ${act.complexity ?? 'default'}`)
    console.log(`keyPointIndex: ${act.keyPointIndex}\n`)

    console.log(`📝 teaching.agent_instruction (${act.teaching?.agent_instruction?.length ?? 0} chars):`)
    console.log(act.teaching?.agent_instruction ?? '(vacío)')
    console.log()

    console.log(`❓ verification.question:`)
    console.log(`   ${act.verification?.question ?? '(vacía)'}`)
    console.log()

    console.log(`✅ verification.success_criteria.must_include:`)
    act.verification?.success_criteria?.must_include?.forEach((c, j) =>
      console.log(`   ${j + 1}. ${c}`)
    )
    if (act.verification?.success_criteria?.understanding_level) {
      console.log(`   nivel esperado: ${act.verification.success_criteria.understanding_level}`)
    }
    if (act.verification?.success_criteria?.min_completeness !== undefined) {
      console.log(`   min_completeness: ${act.verification.success_criteria.min_completeness}`)
    }
    if (act.verification?.open_ended) {
      console.log(`   open_ended: true`)
    }
    console.log()
  })

  await prisma.$disconnect()
}

main().catch(console.error)
