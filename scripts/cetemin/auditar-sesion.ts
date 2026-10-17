/**
 * Audita la transcripción de una sesión de prueba contra las reglas de clase.
 *
 *   npx tsx scripts/cetemin/auditar-sesion.ts <sessionId>
 *
 * Qué revisa (lo que falló en la primera prueba de SI-ALTORIESGO S1, 15 oct 2026):
 *  R1  En los pasos sin nota Sophia no califica («correcto», «exacto», «bien pensado»…).
 *  R2  En cada punto clave, Sophia dio el ejemplo resuelto ANTES de la pregunta.
 *  R3  Sophia nunca nombró los casos del equipo.
 *  R4  La sesión terminó y cupo en el presupuesto de turnos.
 *  R5  Sophia no dijo «lee el texto» de otra actividad en vez de enseñar (aviso).
 * Sale con código 1 si alguna regla dura falla.
 */
import { prisma } from '../../lib/prisma'
import { agruparPorActividad } from '../../lib/cuaderno'
import type { Activity, LessonContent } from '../../types/lesson'
import { REGISTRO } from './cursos/registro'
import { idsDePuntosClave } from './plantillas'
import { MAX_TURNOS } from './validar'
import type { SesionSpec } from './tipos'

const CALIFICA = /\b(correcto|exacto|perfecto|excelente|muy bien|bien pensado|bien observado|buena observación)\b/i

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function corto(t: string, n = 110): string {
  const limpio = t.replace(/\s+/g, ' ').trim()
  return limpio.length > n ? `${limpio.slice(0, n)}…` : limpio
}

function specPorSlug(slug: string): SesionSpec | null {
  for (const entrada of Object.values(REGISTRO)) {
    for (const s of Object.values(entrada.sesiones)) if (s.slug === slug) return s
  }
  return null
}

async function main() {
  const sessionId = process.argv[2]
  if (!sessionId) {
    console.error('Uso: npx tsx scripts/cetemin/auditar-sesion.ts <sessionId>')
    process.exit(1)
  }
  const sesion = await prisma.lessonSession.findUnique({
    where: { id: sessionId },
    select: { id: true, completedAt: true, isTest: true, lesson: { select: { slug: true, title: true, contentJson: true } } },
  })
  if (!sesion) throw new Error(`no existe la sesión ${sessionId}`)
  const spec = specPorSlug(sesion.lesson.slug)
  if (!spec) throw new Error(`la lección ${sesion.lesson.slug} no está en scripts/cetemin/cursos/registro.ts`)
  const actividades = (sesion.lesson.contentJson as unknown as LessonContent).activities
  const porId = new Map(actividades.map((a) => [a.id, a]))
  const mensajes = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { timestamp: 'asc' },
    select: { role: true, content: true, activityId: true },
  })
  const grupos = agruparPorActividad(mensajes, actividades.map((a) => a.id), null)
  const deSophia = (a: Activity | undefined) => a && a.verification.is_evaluative === false

  const fallas: string[] = []
  const avisos: string[] = []
  const ok: string[] = []

  // R1: la respuesta de Sophia a un turno sin nota no califica
  let r1 = 0
  for (let i = 0; i < mensajes.length; i++) {
    const m = mensajes[i]
    if (m.role !== 'user' || !deSophia(porId.get(m.activityId ?? ''))) continue
    const respuesta = mensajes.slice(i + 1).find((x) => x.role === 'assistant')
    const hit = respuesta?.content.match(CALIFICA)
    if (hit) { r1++; fallas.push(`R1 ${m.activityId}: Sophia calificó («${hit[0]}»): «${corto(respuesta!.content)}»`) }
  }
  if (!r1) ok.push('R1 en los pasos sin nota Sophia no calificó')

  // R2: en cada punto clave, el ejemplo resuelto aparece antes de la pregunta
  let r2 = 0
  idsDePuntosClave(spec).forEach((id, i) => {
    const p = spec.puntosClave[i]
    const grupo = grupos.find((g) => g.actividadId === id)
    const primera = grupo?.mensajes.find((m) => m.role === 'assistant')
    if (!primera) { r2++; fallas.push(`R2 ${id}: no hay mensaje de Sophia bajo esta actividad`); return }
    const texto = primera.content.toLowerCase()
    const posEjemplo = texto.indexOf(p.ejemploClave.toLowerCase())
    const posPregunta = texto.indexOf('¿')
    if (posEjemplo < 0) { r2++; fallas.push(`R2 ${id}: Sophia no dio el ejemplo («${p.ejemploClave}») antes de preguntar: «${corto(primera.content)}»`) }
    else if (posPregunta >= 0 && posPregunta < posEjemplo) { r2++; fallas.push(`R2 ${id}: la pregunta salió antes que el ejemplo: «${corto(primera.content)}»`) }
    // R5: mandó a leer otro texto en vez de enseñar
    const leeOtro = primera.content.match(/lee (?:el texto|la lámina) «?"?([^»"]+)»?"?/i)
    if (leeOtro && leeOtro[1].trim().toLowerCase() !== p.lamina.title.toLowerCase() && leeOtro[1].trim().toLowerCase() !== p.norma.title.toLowerCase()) {
      avisos.push(`R5 ${id}: Sophia mandó a leer «${leeOtro[1].trim()}», que no es el material de esta actividad`)
    }
  })
  if (!r2) ok.push('R2 en cada punto clave el ejemplo resuelto fue antes de la pregunta')

  // R3: los casos del equipo no se nombran
  let r3 = 0
  for (const m of mensajes) {
    if (m.role !== 'assistant') continue
    for (const nombre of spec.casosDelEquipo) {
      if (new RegExp(`\\b${escapar(nombre)}\\b`, 'i').test(m.content)) { r3++; fallas.push(`R3 ${m.activityId ?? '?'}: Sophia nombró «${nombre}»: «${corto(m.content)}»`) }
    }
  }
  if (!r3) ok.push('R3 Sophia no nombró los casos del equipo')

  // R4: terminó y cupo
  const turnos = mensajes.filter((m) => m.role === 'user').length
  if (!sesion.completedAt) fallas.push(`R4 la sesión no terminó (${grupos.length} de ${actividades.length} actividades con mensajes)`)
  if (turnos > MAX_TURNOS) fallas.push(`R4 ${turnos} turnos del alumno; el tope es ${MAX_TURNOS}`)
  if (sesion.completedAt && turnos <= MAX_TURNOS) ok.push(`R4 terminó en ${turnos} turnos (tope ${MAX_TURNOS})`)

  console.log(`Sesión ${sessionId}${sesion.isTest ? ' (prueba)' : ''} · ${sesion.lesson.title}`)
  console.log('Turnos por actividad: ' + grupos.map((g) => `${g.actividadId.replace(`${spec.idPrefijo}-`, '')}:${g.mensajes.filter((m) => m.role === 'user').length}`).join(' · '))
  for (const o of ok) console.log(`✅ ${o}`)
  for (const a of avisos) console.log(`⚠️  ${a}`)
  for (const f of fallas) console.log(`❌ ${f}`)
  console.log(fallas.length ? `\n${fallas.length} falla(s): corregir antes de publicar.` : '\nSin fallas.')
  if (fallas.length) process.exitCode = 1
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
