/**
 * Auditoría de la regla de nombres (lib/planner/titulos.ts) sobre todas las
 * lecciones: título de la lección y de cada actividad. Solo lee. Primero las
 * publicadas. Renombrar una lección publicada es decisión del equipo: los
 * alumnos la reconocen por su nombre.
 *
 * Uso: node --env-file=.env --import tsx scripts/auditar-titulos.ts
 */
import { prisma } from '../lib/prisma'
import { parseContentJson } from '../lib/lesson-parser'
import { avisosDeTitulos } from '../lib/planner/titulos'
import type { LessonContent } from '../types/lesson'

async function main() {
  const lecciones = await prisma.lesson.findMany({
    select: { id: true, title: true, isPublished: true, contentJson: true, course: { select: { title: true } } },
    orderBy: [{ isPublished: 'desc' }, { title: 'asc' }],
  })
  let titulosMal = 0
  let sinNombre = 0
  for (const l of lecciones) {
    const contenido = l.contentJson ? (parseContentJson(l.contentJson) as LessonContent) : null
    const avisos = avisosDeTitulos(l.title, contenido?.activities ?? [])
    const deLaLeccion = avisos.find((a) => a.activityId === null)
    const actividadesSinNombre = avisos.filter((a) => a.activityId && !a.texto).length
    const actividadesMal = avisos.filter((a) => a.activityId && a.texto)
    if (!avisos.length) continue
    if (deLaLeccion) titulosMal++
    sinNombre += actividadesSinNombre
    console.log(`\n${l.isPublished ? '🟢 publicada' : '⚪ borrador '} · ${l.course?.title ?? 'sin curso'} · «${l.title}»`)
    if (deLaLeccion) console.log(`   título: ${deLaLeccion.motivos.join(' ')}`)
    if (actividadesSinNombre) console.log(`   ${actividadesSinNombre} actividad(es) sin nombre`)
    for (const a of actividadesMal) console.log(`   ${a.activityId}: «${a.texto}» — ${a.motivos.join(' ')}`)
  }
  console.log(`\n${lecciones.length} lecciones · ${titulosMal} con el título fuera de la regla · ${sinNombre} actividades sin nombre`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
