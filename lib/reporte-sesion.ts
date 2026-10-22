/**
 * Reporte de un alumno en una sesión (21 oct 2026).
 *
 * Responde tres preguntas con lo que ya se guarda: cuánto avanzó, qué logró
 * (por punto clave, con la escala oficial) y qué le falta. Las cifras salen de
 * la misma función que la nota (`calculateRubricLevel`), así la ficha, el
 * Monitor y la nota dicen lo mismo. Decisión de Walther: el resultado de una
 * sesión queda fijo; lo que pase en la siguiente no lo cambia.
 *
 * Vocabulario (formato MINEDU / política de evaluación de CETEMIN):
 *   logro de aprendizaje  = puntos clave logrados sobre el total de la sesión
 *   nivel de logro        = En inicio · En proceso · Logrado · Destacado
 *   desempeño             = la nota en /20
 *   dominio de criterios  = criterios cubiertos sobre los evaluados
 */
import { calculateRubricLevel, gradeToRubricLevel, type RubricLevel } from '@/lib/rubric'
import { enriquecerConPlan, notaDeLaSesion, type ActividadDelPlan, type ProgresoGuardado } from '@/lib/grading'
import { getActivityBlocks } from '@/lib/support-blocks'
import { tituloActividad } from '@/lib/actividad-titulo'
import type { Activity } from '@/types/lesson'

export const NIVEL_TEXTO: Record<RubricLevel, string> = {
  logrado_destacado: 'Destacado',
  logrado: 'Logrado',
  en_proceso: 'En proceso',
  en_inicio: 'En inicio',
}

const ORDEN: RubricLevel[] = ['en_inicio', 'en_proceso', 'logrado', 'logrado_destacado']
const LOGRADO = new Set<RubricLevel>(['logrado', 'logrado_destacado'])

type Intento = {
  studentResponse?: string
  analysis?: { criteriaMatched?: string[]; criteriaMissing?: string[]; unverified?: boolean }
}

export type ProgresoReporte = ProgresoGuardado & {
  status: string
  startedAt?: Date | string | null
  completedAt?: Date | string | null
}

export type MensajeDelAlumno = { activityId: string | null; content: string; timestamp?: Date | string }

/** Dónde está el alumno ahora mismo (22 oct 2026): lo que la ficha no decía. */
export type Ubicacion = {
  estado: 'terminada' | 'escribiendo' | 'en_pausa' | 'lo_dejo' | 'cerro_sin_terminar'
  actividad: ActividadDelReporte | null
  /** Minutos desde su último mensaje; null si no escribió nada. */
  minutosSinEscribir: number | null
}

/** Con la ventana abierta: menos de 2 min es escribiendo, hasta 10 es pausa, más es que lo dejó. */
export const ESCRIBIENDO_HASTA_MIN = 2
export const PAUSA_HASTA_MIN = 10

export type ActividadDelReporte = {
  id: string
  indice: number
  titulo: string
  evaluativa: boolean
  puntoClave: number | null
  estado: 'completada' | 'en_curso' | 'sin_llegar'
  /** null: sin nota, sin evaluar o sin llegar. */
  nivel: RubricLevel | null
  porLimite: boolean
  intentos: number
  criterios: { texto: string; cubierto: boolean }[]
  /** Lo que escribió en el primer y en el último intento. */
  primera: string | null
  respuesta: string | null
  /** Solo si la actividad tiene una norma con línea que respalda. */
  lectura: 'comprobada' | 'sin_comprobar' | null
  normaTitulo: string | null
  /** Mensajes que el verificador evaluó en la actividad (un desglose no suma en `intentos`). */
  turnos: number
  /** La respuesta de fondo: el primer mensaje con contenido que escribió en la actividad. */
  cita: string | null
  /** Línea de tiempo: cuántos mensajes escribió en la actividad y cuánto estuvo en ella. */
  mensajes: number
  palabras: number
  minutos: number | null
}

export type PuntoClaveReporte = {
  indice: number
  titulo: string
  /** El más bajo de sus actividades evaluadas; null si ninguna se evaluó. */
  nivel: RubricLevel | null
  /** Todas sus actividades con nota están completadas. */
  completo: boolean
  actividades: ActividadDelReporte[]
}

export type Oportunidad = {
  actividad: ActividadDelReporte
  tipo: 'criterio' | 'lectura' | 'sin_llegar'
  texto: string
  falta: string[]
}

export type ReporteSesion = {
  avance: {
    hechas: number
    total: number
    conNotaHechas: number
    conNota: number
    terminada: boolean
    /** Participación: cuánto escribió. */
    mensajes: number
    palabrasPorMensaje: number | null
  }
  ubicacion: Ubicacion
  logro: {
    puntosLogrados: number
    puntosTotal: number
    porcentaje: number | null
    nivelSesion: RubricLevel | null
    nota: number | null
    notaVeinte: number | null
    parcial: boolean
    criteriosCubiertos: number
    criteriosTotal: number
    lecturasComprobadas: number
    lecturasTotal: number
  }
  puntosClave: PuntoClaveReporte[]
  actividades: ActividadDelReporte[]
  fortalezas: { actividad: ActividadDelReporte; texto: string; cita: string | null }[]
  oportunidades: Oportunidad[]
  duda: string | null
  acciones: string[]
}

/** «listo», «ok», «sí»: continuaciones, no respuestas. */
const CONTINUACION_RE = /^(listo|ok|ya|s[ií]|dale|bueno|claro)/i

const recortar = (s: string | undefined | null, max = 220): string | null => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

function intentosDe(p: ProgresoReporte | undefined): Intento[] {
  const ev = p?.evidenceData as { attempts?: Intento[] } | null | undefined
  return Array.isArray(ev?.attempts) ? ev!.attempts! : []
}

function normaConClave(a: Activity): string | null {
  for (const b of getActivityBlocks(a)) {
    if (b.type === 'text' && (b.lineasClave?.length ?? 0) > 0) return b.title
  }
  return null
}

function masBajo(niveles: RubricLevel[]): RubricLevel | null {
  if (!niveles.length) return null
  return niveles.reduce((m, n) => (ORDEN.indexOf(n) < ORDEN.indexOf(m) ? n : m))
}

const fecha = (v: Date | string | null | undefined): number | null => {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}
const minutosEntre = (a: number | null, b: number | null): number | null => (a !== null && b !== null ? Math.max(0, Math.round((b - a) / 60_000)) : null)
const palabrasDe = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

export function reporteDeSesion(input: {
  actividades: Activity[]
  keyPoints: string[]
  progresos: ProgresoReporte[]
  /** La sesión terminó (todas las actividades). */
  terminada: boolean
  /** Terminó o su ventana ya cerró: lo que no hizo ya no lo va a hacer en esta sesión. */
  cerrada: boolean
  metodologia?: string | null
  /** Mensajes del alumno (solo `role: 'user'`), con la actividad bajo la que quedaron: de aquí salen la cita y la línea de tiempo. */
  mensajes?: MensajeDelAlumno[]
  /** Puntero de la sesión (`LessonSession.activityId`) y su último movimiento, para decir dónde está. */
  actividadActualId?: string | null
  lastActivityAt?: Date | string | null
  ahora?: Date
}): ReporteSesion {
  const { actividades, keyPoints, progresos, terminada, cerrada, metodologia, mensajes, actividadActualId, lastActivityAt } = input
  const ahora = input.ahora ?? new Date()
  const porId = new Map(progresos.map((p) => [p.activityId, p]))

  const acts: ActividadDelReporte[] = actividades.map((a, i) => {
    const p = porId.get(a.id)
    const evaluativa = a.verification?.is_evaluative !== false
    const estado: ActividadDelReporte['estado'] = !p ? 'sin_llegar' : p.status === 'COMPLETED' ? 'completada' : 'en_curso'
    const intentos = intentosDe(p)
    const cubiertos = new Set(intentos.flatMap((t) => t.analysis?.criteriaMatched ?? []))
    const criterios = (a.verification?.success_criteria?.must_include ?? []).map((texto) => ({ texto, cubierto: cubiertos.has(texto) }))
    const nivel = evaluativa && estado === 'completada' && p ? calculateRubricLevel(enriquecerConPlan(p, a as ActividadDelPlan)) : null
    const normaTitulo = normaConClave(a)
    const sinComprobar = (p?.evidenceData as { lecturaNoComprobada?: boolean } | null | undefined)?.lecturaNoComprobada
    const lectura: ActividadDelReporte['lectura'] =
      normaTitulo && p && estado !== 'sin_llegar' && typeof sinComprobar === 'boolean' ? (sinComprobar ? 'sin_comprobar' : 'comprobada') : null
    // La cita sale de lo que escribió, no de la evidencia: el turno de tocar la
    // línea guarda «la línea tres» como respuesta verificada, y la respuesta real
    // (que no se evaluó porque faltaba la línea) solo está en los mensajes.
    const propios = (mensajes ?? []).filter((m) => m.activityId === a.id)
    const escritos = propios.map((m) => m.content.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const deFondo = escritos.find((t) => t.split(' ').length >= 4 && !CONTINUACION_RE.test(t)) ?? [...escritos].sort((x, y) => y.length - x.length)[0]
    // Línea de tiempo: desde que entró a la actividad (o su primer mensaje) hasta
    // que la completó (o su último mensaje, si sigue ahí).
    const marcas = propios.map((m) => fecha(m.timestamp)).filter((t): t is number => t !== null)
    const inicio = [fecha(p?.startedAt), marcas[0]].filter((t): t is number => t !== null).sort((x, y) => x - y)[0] ?? null
    // Hasta lo último que pasó en ella: completarla o su último mensaje (el toque
    // de la línea puede llegar después de que el verificador la dio por hecha).
    const fin = [fecha(p?.completedAt), marcas.length ? marcas[marcas.length - 1] : null].filter((t): t is number => t !== null).sort((x, y) => y - x)[0] ?? null
    return {
      id: a.id,
      indice: i + 1,
      titulo: a.title?.trim() || tituloActividad(a, i),
      evaluativa,
      puntoClave: typeof a.keyPointIndex === 'number' ? a.keyPointIndex : null,
      estado,
      nivel,
      porLimite: evaluativa && estado === 'completada' && p?.passedCriteria === false,
      intentos: p?.attempts ?? 0,
      criterios,
      primera: recortar(intentos[0]?.studentResponse),
      respuesta: recortar(intentos.at(-1)?.studentResponse),
      lectura,
      normaTitulo,
      turnos: intentos.length,
      cita: recortar(deFondo) ?? recortar(intentos[0]?.studentResponse),
      mensajes: escritos.length,
      palabras: escritos.reduce((n, t) => n + palabrasDe(t), 0),
      minutos: estado === 'sin_llegar' ? null : minutosEntre(inicio, fin),
    }
  })

  // ── Dónde está ahora ─────────────────────────────────────────────────────
  const actual = acts.find((x) => x.id === actividadActualId) ?? acts.find((x) => x.estado === 'en_curso') ?? acts.find((x) => x.estado === 'sin_llegar') ?? null
  const ultimoMensaje = (mensajes ?? []).map((m) => fecha(m.timestamp)).filter((t): t is number => t !== null).sort((x, y) => y - x)[0] ?? fecha(lastActivityAt)
  const minutosSinEscribir = minutosEntre(ultimoMensaje, ahora.getTime())
  const ubicacion: Ubicacion = terminada
    ? { estado: 'terminada', actividad: null, minutosSinEscribir }
    : cerrada
      ? { estado: 'cerro_sin_terminar', actividad: actual, minutosSinEscribir }
      : {
          estado:
            minutosSinEscribir !== null && minutosSinEscribir < ESCRIBIENDO_HASTA_MIN
              ? 'escribiendo'
              : minutosSinEscribir !== null && minutosSinEscribir < PAUSA_HASTA_MIN
                ? 'en_pausa'
                : 'lo_dejo',
          actividad: actual,
          minutosSinEscribir,
        }

  // ── Puntos clave: el nivel más bajo de sus actividades con nota ──────────
  const puntosClave: PuntoClaveReporte[] = keyPoints
    .map((titulo, indice) => {
      const propias = acts.filter((x) => x.evaluativa && x.puntoClave === indice)
      if (!propias.length) return null
      const evaluadas = propias.filter((x) => x.estado === 'completada' && x.nivel)
      return {
        indice,
        titulo,
        nivel: masBajo(evaluadas.map((x) => x.nivel!)),
        completo: propias.every((x) => x.estado === 'completada'),
        actividades: propias,
      }
    })
    .filter((x): x is PuntoClaveReporte => x !== null)

  const puntosLogrados = puntosClave.filter((k) => k.completo && k.nivel && LOGRADO.has(k.nivel)).length
  const puntosTotal = puntosClave.length

  // ── Nota: la misma función de siempre, con lo completado ─────────────────
  const completadas = progresos.filter((p) => p.status === 'COMPLETED')
  const nota = completadas.length ? notaDeLaSesion(actividades as ActividadDelPlan[], completadas, metodologia) : null
  const evaluativas = acts.filter((x) => x.evaluativa)

  const criteriosTotal = evaluativas.reduce((s, x) => s + x.criterios.length, 0)
  const criteriosCubiertos = evaluativas.reduce((s, x) => s + x.criterios.filter((c) => c.cubierto).length, 0)
  const conNorma = evaluativas.filter((x) => x.normaTitulo)
  const lecturasComprobadas = conNorma.filter((x) => x.lectura === 'comprobada').length

  // ── Fortalezas: logrado sin ayuda ────────────────────────────────────────
  const fortalezas = evaluativas
    .filter((x) => x.estado === 'completada' && x.nivel && LOGRADO.has(x.nivel) && !x.porLimite)
    .map((x) => {
      const destacado = x.nivel === 'logrado_destacado'
      const partes: string[] = []
      partes.push(
        x.turnos <= 1
          ? destacado ? 'va más allá de lo pedido a la primera' : 'decide y da la razón a la primera'
          : `lo logra en ${x.turnos} turnos${destacado ? ' y va más allá de lo pedido' : ''}`
      )
      if (x.lectura === 'comprobada') partes.push('señala la línea de la norma que lo respalda')
      return { actividad: x, texto: partes.join(' y '), cita: x.cita }
    })

  // ── Oportunidades: lo que no logró, con su evidencia ─────────────────────
  const oportunidades: Oportunidad[] = []
  for (const x of evaluativas) {
    if (x.estado === 'completada' && (x.porLimite || (x.nivel && !LOGRADO.has(x.nivel)))) {
      const falta = x.criterios.filter((c) => !c.cubierto).map((c) => c.texto)
      oportunidades.push({
        actividad: x,
        tipo: 'criterio',
        texto: `${x.nivel ? NIVEL_TEXTO[x.nivel] : 'Sin evaluar'}${x.porLimite ? ', avanzó por límite' : ''} · ${x.intentos} ${x.intentos === 1 ? 'intento' : 'intentos'}`,
        falta,
      })
    } else if (x.estado === 'completada' && x.lectura === 'sin_comprobar') {
      oportunidades.push({ actividad: x, tipo: 'lectura', texto: `Respondió bien, pero no señaló la línea en «${x.normaTitulo}»`, falta: [] })
    }
  }
  if (cerrada && !terminada) {
    for (const x of evaluativas.filter((y) => y.estado === 'sin_llegar')) {
      oportunidades.push({ actividad: x, tipo: 'sin_llegar', texto: 'No llegó a esta actividad', falta: x.criterios.map((c) => c.texto) })
    }
  }

  // ── La duda que dejó al cerrar ───────────────────────────────────────────
  const cierre = acts.find((x) => actividades[x.indice - 1]?.type === 'closing')
  const duda = cierre && cierre.estado === 'completada' ? cierre.respuesta : null

  // ── Acciones para el instructor (sin cerrar nada desde otra sesión) ──────
  const acciones: string[] = []
  const vistos = new Set<string>()
  for (const o of oportunidades) {
    if (o.tipo === 'criterio' && o.falta.length) {
      const clave = o.actividad.puntoClave !== null ? keyPoints[o.actividad.puntoClave] ?? o.actividad.titulo : o.actividad.titulo
      const id = `c:${clave}`
      if (vistos.has(id)) continue
      vistos.add(id)
      acciones.push(`Reforzar «${clave}»: ${o.falta[0]}`)
    } else if (o.tipo === 'lectura') {
      acciones.push(`Pedirle que señale en «${o.actividad.normaTitulo}» la línea que respalda su respuesta (actividad ${o.actividad.indice}).`)
    }
  }
  const sinLlegar = oportunidades.filter((o) => o.tipo === 'sin_llegar')
  if (sinLlegar.length) acciones.push(`Revisar con él lo que no alcanzó: ${sinLlegar.map((o) => o.actividad.titulo).join(', ')}.`)
  if (duda && !/^(ninguna|nada|no|todo (está )?claro)[.!]?$/i.test(duda)) acciones.push(`Responder su duda al cerrar: «${duda}».`)
  // La ventana sigue abierta y dejó de escribir: la acción es ahora, no el martes.
  if (ubicacion.estado === 'lo_dejo' && ubicacion.actividad) {
    acciones.unshift(
      `Escribirle ahora: dejó la sesión en la actividad ${ubicacion.actividad.indice}${ubicacion.minutosSinEscribir !== null ? ` hace ${ubicacion.minutosSinEscribir} min` : ''} y la ventana sigue abierta.`
    )
  }

  const totalMensajes = acts.reduce((n, x) => n + x.mensajes, 0)
  const totalPalabras = acts.reduce((n, x) => n + x.palabras, 0)

  return {
    avance: {
      hechas: acts.filter((x) => x.estado === 'completada').length,
      total: acts.length,
      conNotaHechas: evaluativas.filter((x) => x.estado === 'completada').length,
      conNota: evaluativas.length,
      terminada,
      mensajes: totalMensajes,
      palabrasPorMensaje: totalMensajes ? Math.round(totalPalabras / totalMensajes) : null,
    },
    ubicacion,
    logro: {
      puntosLogrados,
      puntosTotal,
      porcentaje: puntosTotal ? Math.round((puntosLogrados / puntosTotal) * 100) : null,
      nivelSesion: nota === null ? null : gradeToRubricLevel(nota),
      nota,
      notaVeinte: nota === null ? null : Math.round((nota / 5) * 10) / 10,
      parcial: !terminada,
      criteriosCubiertos,
      criteriosTotal,
      lecturasComprobadas,
      lecturasTotal: conNorma.length,
    },
    puntosClave,
    actividades: acts,
    fortalezas,
    oportunidades,
    duda,
    acciones,
  }
}
