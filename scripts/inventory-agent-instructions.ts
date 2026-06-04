/**
 * Inventario: ¿qué lecciones tienen agent_instruction más largo que 80 palabras?
 * Esas son las que generan reportes inventados (causa #6 + #10 del diagnóstico
 * de María Céspedes 2026-06-03).
 *
 * Output: lista por curso/lección/actividad con conteo de palabras + indicador
 * de gravedad (>200 = crítico, 80-200 = alto, ≤80 = ok).
 *
 * Uso: npx tsx scripts/inventory-agent-instructions.ts
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

const TARGET_MAX_WORDS = 80
const HIGH_THRESHOLD = 200

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function fmt(n: number, w: number): string {
  return String(n).padStart(w)
}

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      contentJson: true,
      course: { select: { title: true } },
    },
    orderBy: [{ course: { title: 'asc' } }, { title: 'asc' }],
  })

  type Row = {
    course: string
    lesson: string
    activityId: string
    words: number
    chars: number
    preview: string
  }

  const rows: Row[] = []
  let totalActivities = 0
  let ok = 0
  let high = 0
  let critical = 0

  for (const lesson of lessons) {
    const content = lesson.contentJson as LessonContent | null
    const acts = content?.activities ?? []
    for (const act of acts) {
      const instr = act.teaching?.agent_instruction ?? ''
      const words = countWords(instr)
      const chars = instr.length
      totalActivities++
      if (words <= TARGET_MAX_WORDS) ok++
      else if (words <= HIGH_THRESHOLD) high++
      else critical++
      rows.push({
        course: lesson.course?.title ?? '(sin curso)',
        lesson: lesson.title,
        activityId: act.id,
        words,
        chars,
        preview: instr.slice(0, 60).replace(/\n/g, ' '),
      })
    }
  }

  // Ordenar por gravedad descendente
  rows.sort((a, b) => b.words - a.words)

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 INVENTARIO — agent_instruction por actividad`)
  console.log(`   Lineamiento: máximo ${TARGET_MAX_WORDS} palabras (~400 chars)`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  console.log(`${fmt(0, 4).replace('0', ' ')} ${'Curso'.padEnd(35)} ${'Lección'.padEnd(35)} ${'Activity'.padEnd(40)} ${'Palabras'.padStart(9)} ${'Chars'.padStart(7)}  Estado`)
  console.log('─'.repeat(150))
  for (const r of rows) {
    const status = r.words > HIGH_THRESHOLD
      ? '🔴 CRÍTICO'
      : r.words > TARGET_MAX_WORDS
      ? '🟡 ALTO   '
      : '🟢 OK     '
    console.log(`${r.course.slice(0, 35).padEnd(35)} ${r.lesson.slice(0, 35).padEnd(35)} ${r.activityId.slice(0, 40).padEnd(40)} ${fmt(r.words, 9)} ${fmt(r.chars, 7)}  ${status}`)
  }

  console.log()
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 RESUMEN`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Total actividades:      ${totalActivities}`)
  console.log(`  🟢 OK (≤${TARGET_MAX_WORDS} palabras):       ${ok} (${Math.round((ok / totalActivities) * 100)}%)`)
  console.log(`  🟡 Alto (${TARGET_MAX_WORDS + 1}-${HIGH_THRESHOLD} palabras): ${high} (${Math.round((high / totalActivities) * 100)}%)`)
  console.log(`  🔴 Crítico (>${HIGH_THRESHOLD} palabras):  ${critical} (${Math.round((critical / totalActivities) * 100)}%)`)
  console.log()

  // Lecciones únicas afectadas
  const affectedLessons = new Set<string>()
  for (const r of rows) {
    if (r.words > TARGET_MAX_WORDS) {
      affectedLessons.add(`${r.course} → ${r.lesson}`)
    }
  }
  if (affectedLessons.size > 0) {
    console.log(`🛠️  Lecciones que necesitan refactor (${affectedLessons.size}):`)
    Array.from(affectedLessons).sort().forEach((l) => console.log(`   • ${l}`))
    console.log()
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
