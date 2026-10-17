/**
 * Auditoría «una actividad = un pedido» (lib/planner/pedidos.ts) sobre todas
 * las lecciones de la base. Solo lee: lista las preguntas que piden más de una
 * cosa, primero las de lecciones publicadas.
 *
 * Uso: node --env-file=.env --import tsx scripts/auditar-pedidos.ts
 */
import { prisma } from '../lib/prisma'
import { parseContentJson } from '../lib/lesson-parser'
import { avisosDePedidos } from '../lib/planner/pedidos'
import type { LessonContent } from '../types/lesson'

async function main() {
  const lecciones = await prisma.lesson.findMany({
    select: { id: true, title: true, isPublished: true, contentJson: true, course: { select: { title: true } } },
    orderBy: [{ isPublished: 'desc' }, { title: 'asc' }],
  })

  let conAvisos = 0
  let total = 0
  for (const l of lecciones) {
    if (!l.contentJson) continue
    const contenido = parseContentJson(l.contentJson) as LessonContent
    const avisos = avisosDePedidos(contenido.activities ?? [])
    if (!avisos.length) continue
    conAvisos++
    total += avisos.length
    console.log(`\n${l.isPublished ? '🟢 publicada' : '⚪ borrador '} · ${l.course?.title ?? 'sin curso'} · ${l.title} (${l.id})`)
    for (const a of avisos) console.log(`   ${a.activityId} [${a.campo}] ${a.motivo}\n      «${a.texto}»`)
  }
  console.log(`\n${lecciones.length} lecciones revisadas · ${conAvisos} con preguntas de más de un pedido · ${total} preguntas en total`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
