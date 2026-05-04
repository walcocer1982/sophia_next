import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

/**
 * For ProExplo lessons, mark which activities are evaluative vs non-evaluative.
 *
 * Strategy:
 * - Closing/synthesis activities → NON-evaluative (open reflection)
 * - First explanation activity → can be NON-evaluative if it's a diagnostic
 * - Practice activities → EVALUATIVE (default)
 * - All others → EVALUATIVE by default
 */

interface NonEvaluativeRule {
  lessonTitleContains: string
  nonEvaluativeActivityIds: string[]
}

const RULES: NonEvaluativeRule[] = [
  {
    lessonTitleContains: 'Perforación Subterránea',
    // act-1-1: apertura (diagnóstica, no evaluar)
    // act-1-4: reflexión (subjetiva)
    // act-1-5: cierre (síntesis)
    nonEvaluativeActivityIds: ['act-1-1', 'act-1-4', 'act-1-5'],
  },
  {
    lessonTitleContains: 'Yacimientos Minerales',
    // act-2-1: apertura
    // act-2-5: cierre
    nonEvaluativeActivityIds: ['act-2-1', 'act-2-5'],
  },
  {
    lessonTitleContains: 'Flotación',
    // act-3-1: apertura
    // act-3-4: comparación abierta (subjetiva)
    // act-3-5: cierre
    nonEvaluativeActivityIds: ['act-3-1', 'act-3-5'],
  },
]

async function main() {
  console.log('Marcando preguntas evaluativas vs no evaluativas en ProExplo...\n')

  for (const rule of RULES) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: { contains: rule.lessonTitleContains, mode: 'insensitive' } },
      select: { id: true, title: true, contentJson: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!lesson) {
      console.warn(`No encontrada: ${rule.lessonTitleContains}`)
      continue
    }

    const content = lesson.contentJson as unknown as LessonContent

    let evaluativeCount = 0
    let nonEvalCount = 0

    for (const activity of content.activities) {
      const isNonEval = rule.nonEvaluativeActivityIds.includes(activity.id)
      if (!activity.verification) continue
      activity.verification.is_evaluative = !isNonEval
      if (isNonEval) nonEvalCount++
      else evaluativeCount++
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { contentJson: content as unknown as object },
    })

    console.log(`✓ ${lesson.title}`)
    console.log(`  Evaluativas: ${evaluativeCount}, No evaluativas: ${nonEvalCount}`)
    console.log(`  No-eval IDs: ${rule.nonEvaluativeActivityIds.join(', ')}\n`)
  }

  console.log('Hecho.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
