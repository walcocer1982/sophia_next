/**
 * Reglas que una sesión de curso tiene que cumplir ANTES de entrar a la base.
 * Si una falla, no se carga. Son las reglas de CLAUDE.md («Sesiones de curso
 * con Sophia», 15 oct 2026) convertidas en comprobaciones.
 */
import { GeneratedStructureSchema } from '../../lib/planner/validation'
import { avisosDePedidos } from '../../lib/planner/pedidos'
import { avisosDeTitulos } from '../../lib/planner/titulos'
import type { Activity } from '../../types/lesson'
import type { SesionSpec } from './tipos'
import { idDelCasoCorto, idsDePuntosClave } from './plantillas'

// 24 desde el 21 oct 2026: cada punto clave suma un turno para señalar en el texto
// de la norma la línea que respalda la respuesta (subrayado).
export const MAX_TURNOS = 24
export const MAX_PALABRAS_INSTRUCCION = 90

/**
 * Turnos que admite la sesión: los intentos de cada actividad más uno por cada
 * actividad con un texto propio para subrayar (el turno de subrayar no cuenta
 * intento, pero sí es un mensaje del alumno).
 */
export function turnosPosibles(actividades: Activity[]): number {
  return actividades.reduce(
    (s, a) => s + (a.verification.max_attempts ?? 3) + (a.teaching.blocks?.some((b) => b.type === 'text' && b.subrayable) ? 1 : 0),
    0,
  )
}
export const MIN_DESCRIPCION_IMAGEN = 60

function palabras(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length
}

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validarSesion(spec: SesionSpec, actividades: Activity[]): string[] {
  const errores: string[] = []
  const err = (m: string) => errores.push(m)

  // 1. Esquema, un pedido por pregunta, nombres en tono de sílabo (reglas ya existentes en Sophia)
  const parsed = GeneratedStructureSchema.safeParse({ activities: actividades })
  if (!parsed.success) err(`estructura: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`)
  for (const a of avisosDePedidos(actividades)) err(`${a.activityId} (${a.campo}): ${a.motivo} «${a.texto}»`)
  for (const a of avisosDeTitulos(spec.title, actividades)) err(`${a.activityId ?? 'lección'}: ${a.motivos.join(' ')} «${a.texto}»`)

  // 2. Sin alternativas: ni choice ni checks
  for (const a of actividades) {
    if (a.choice) err(`${a.id}: trae alternativas (choice); en una sesión de curso no van`)
    if (a.checks?.length) err(`${a.id}: trae comprobación cerrada (checks); la comprobación es del instructor`)
  }

  // 3. La rutina: tres pasos sin nota, un turno (Pienso, dos), al inicio
  const rutina = actividades.slice(0, 3)
  const topes = [1, 2, 1]
  rutina.forEach((a, i) => {
    if (a.type !== 'reflection') err(`${a.id}: la rutina es de tipo reflection`)
    if (a.verification.is_evaluative !== false) err(`${a.id}: la rutina no lleva nota`)
    if (a.verification.max_attempts !== topes[i]) err(`${a.id}: la rutina admite ${topes[i]} intento(s), no ${a.verification.max_attempts}`)
  })
  const consigna = rutina[0]?.teaching.blocks?.find((b) => b.type === 'text' && b.kind === 'consigna')
  if (!consigna) err(`${rutina[0]?.id}: la rutina necesita la consigna con las tres preguntas en la pizarra`)

  // 4. Cada punto clave enseña primero, con ejemplo, y cabe en la transición
  for (const id of idsDePuntosClave(spec)) {
    const a = actividades.find((x) => x.id === id)
    if (!a) { err(`falta la actividad ${id}`); continue }
    const ins = a.teaching.agent_instruction
    if (!ins.startsWith('Enseña primero')) err(`${id}: la instrucción empieza con «Enseña primero»`)
    if (!ins.includes('Resuelve tú')) err(`${id}: la instrucción trae un ejemplo resuelto («Resuelve tú…»)`)
    const n = palabras(ins)
    if (n > MAX_PALABRAS_INSTRUCCION) err(`${id}: instrucción de ${n} palabras; máximo ${MAX_PALABRAS_INSTRUCCION} para que quepa en la transición`)
    if (a.verification.max_attempts !== 2) err(`${id}: un punto clave admite un reintento (max_attempts 2)`)
    const norma = a.teaching.blocks?.find((b) => b.type === 'text' && b.kind === 'norma')
    if (!norma?.pinned) err(`${id}: el texto de la norma va fijado (pinned) para que el caso corto lo tenga`)
  }
  for (const p of spec.puntosClave) {
    if (!p.ejemplo.toLowerCase().includes(p.ejemploClave.toLowerCase())) err(`${p.id}: la palabra clave «${p.ejemploClave}» no está en el ejemplo`)
  }

  // 5. El caso corto cierra con las normas a la vista; el cierre no lleva nota
  const caso = actividades.find((x) => x.id === idDelCasoCorto(spec))
  if (!caso?.teaching.blocks?.some((b) => b.type === 'case')) err(`${idDelCasoCorto(spec)}: el caso corto va como bloque de caso en la pizarra`)
  const ultima = actividades[actividades.length - 1]
  if (ultima.type !== 'closing' || ultima.verification.is_evaluative !== false) err(`${ultima.id}: la última actividad es un cierre sin nota`)

  // 5a. Todo punto clave pide señalar en la norma la línea que respalda (lectura comprobada)
  for (const p of spec.puntosClave) {
    if (!p.subrayar) err(`${p.id}: falta subrayar.respalda (la línea de la norma que respalda la respuesta)`)
  }

  // 5b. Un texto subrayable declara la línea que respalda la respuesta (si no, nadie puede revisarlo)
  for (const a of actividades) {
    for (const b of a.teaching.blocks ?? []) {
      if (b.type === 'text' && b.subrayable && !b.lineasClave?.length) err(`${a.id}: «${b.title}» es subrayable pero no se encontró la línea que respalda (subrayar.respalda)`)
    }
  }

  // 6. Presupuesto de turnos: 45 minutos
  const turnos = turnosPosibles(actividades)
  if (turnos > MAX_TURNOS) err(`la sesión admite hasta ${turnos} turnos; el tope es ${MAX_TURNOS} (45 min)`)
  if (actividades.length > 10) err(`${actividades.length} actividades; máximo 10`)

  // 7. Los casos del equipo no aparecen en ningún texto (Sophia no puede gastar lo que no conoce)
  const todo = JSON.stringify({ actividades, contexto: spec.contexto, title: spec.title, objective: spec.objective })
  for (const nombre of spec.casosDelEquipo) {
    if (new RegExp(`\\b${escapar(nombre)}\\b`, 'i').test(todo)) err(`el caso del equipo «${nombre}» aparece en el texto de la sesión`)
  }

  // 8. Material: ids únicos, `uses` apunta a lo fijado antes, descripciones con el texto visible
  const vistos = new Map<string, string>()
  const fijados = new Set<string>()
  for (const a of actividades) {
    for (const u of a.teaching.uses ?? []) {
      if (!fijados.has(u)) err(`${a.id}: uses «${u}» no es un bloque fijado en una actividad anterior`)
    }
    for (const b of a.teaching.blocks ?? []) {
      if (vistos.has(b.id)) err(`${a.id}: el bloque «${b.id}» ya existe en ${vistos.get(b.id)}`)
      vistos.set(b.id, a.id)
      if (b.pinned) fijados.add(b.id)
      if (b.type === 'image' && b.description.length < MIN_DESCRIPCION_IMAGEN) {
        err(`${a.id}: la imagen «${b.id}» tiene una descripción de ${b.description.length} caracteres; Sophia no ve imágenes, escribe lo que está escrito en ella`)
      }
    }
  }

  return errores
}

/** Resumen corto para el mensaje de carga. */
export function resumen(actividades: Activity[]): string {
  const sinNota = actividades.filter((a) => a.verification.is_evaluative === false).length
  const bloques = actividades.reduce((n, a) => n + (a.teaching.blocks?.length ?? 0), 0)
  const turnos = turnosPosibles(actividades)
  return `${actividades.length} actividades (${sinNota} sin nota), ${bloques} bloques de material, hasta ${turnos} turnos; sin alternativas; un pedido por pregunta`
}
