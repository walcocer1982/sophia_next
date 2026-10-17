/**
 * Reglas puras del Monitor (15 oct 2026).
 *
 * Hasta hoy había tres definiciones de «va mal» que no coincidían: la portada
 * contaba solo «no entró», la matriz ordenaba por un peso propio y la pantalla
 * por curso clasificaba por horas (activo / inactivo / abandonado) y además
 * escribía `endedAt` desde un GET que cada pestaña repetía cada 15 s, con lo
 * que un alumno «abandonaba» solo si alguien abría el Monitor —y si volvía
 * dentro de la ventana, su sesión ya estaba muerta y empezaba otra.
 *
 * Acá vive la única regla, sin Prisma, para poder probarla:
 *
 *   - La VENTANA de la sesión manda. Mientras está abierta, el que no escribe
 *     está «en pausa», no abandonó. Cuando cierra, lo que no terminó queda
 *     «sin terminar» (a medias o sin avanzar: los mismos nombres de la matriz).
 *   - Una lección sin horario no tiene ventana: ahí, y solo ahí, se usa el
 *     umbral de 24 h sin actividad para darla por cerrada.
 *   - Nada se escribe en la base para clasificar. El estado se deriva.
 *   - Una alerta queda atendida cuando hay una marca de seguimiento posterior
 *     al evento que la disparó. «Desertó» atiende todo.
 */

export const UMBRAL_ACTIVA_MS = 2 * 3_600_000
export const UMBRAL_SIN_VENTANA_MS = 24 * 3_600_000
/** Mínimo de alumnos que llegaron a una actividad para hablar de cuello de botella. */
export const MIN_LLEGARON_CUELLO = 3

export type EstadoVivo = 'activa' | 'en-pausa' | 'sin-terminar' | 'terminada'
export type Avance = 'a-medias' | 'sin-avanzar' | null

/** Fecha de cierre de una ventana; null si la lección no tiene horario. */
export function cierreDeVentana(
  availableAt: Date | string | null | undefined,
  closesAfterHours: number
): Date | null {
  if (!availableAt) return null
  return new Date(new Date(availableAt).getTime() + closesAfterHours * 3_600_000)
}

/** ¿Se puede dar la sesión por cerrada? Con ventana, por la fecha; sin ventana, por 24 h sin actividad. */
export function ventanaCerrada(cierre: Date | null, lastActivityAt: Date, ahora: Date): boolean {
  if (cierre) return ahora.getTime() > cierre.getTime()
  return ahora.getTime() - lastActivityAt.getTime() > UMBRAL_SIN_VENTANA_MS
}

export function estadoDeSesion(
  s: { completedAt: Date | null; lastActivityAt: Date; completadas: number },
  cierre: Date | null,
  ahora: Date
): { estado: EstadoVivo; avance: Avance; cerrada: boolean } {
  const avance: Avance = s.completadas > 0 ? 'a-medias' : 'sin-avanzar'
  if (s.completedAt) return { estado: 'terminada', avance: null, cerrada: false }
  const cerrada = ventanaCerrada(cierre, s.lastActivityAt, ahora)
  if (cerrada) return { estado: 'sin-terminar', avance, cerrada }
  const activa = ahora.getTime() - s.lastActivityAt.getTime() < UMBRAL_ACTIVA_MS
  return { estado: activa ? 'activa' : 'en-pausa', avance, cerrada }
}

/**
 * Un alumno puede tener varios intentos de la misma lección: gana el que
 * terminó y, si ninguno terminó, el más reciente. Misma regla que la matriz.
 */
export function representativa<T extends { completedAt: Date | null; startedAt: Date }>(
  sesiones: T[]
): T | null {
  let mejor: T | null = null
  for (const s of sesiones) {
    if (!mejor) mejor = s
    else if (!mejor.completedAt && s.completedAt) mejor = s
    else if (!mejor.completedAt && !s.completedAt && mejor.startedAt < s.startedAt) mejor = s
  }
  return mejor
}

/** ¿La marca de seguimiento cubre este evento? Desertó cubre todo. */
export function atendido(
  marca: { estado: string; fecha: Date } | null | undefined,
  evento: Date
): boolean {
  if (!marca) return false
  if (marca.estado === 'DESERTO') return true
  return marca.fecha.getTime() >= evento.getTime()
}

/** Aviso de intentos: a uno del tope, no al tope (ahí el código ya avanzó al alumno). */
export function avisoDeIntentos(attempts: number, maximo: number): boolean {
  return attempts > 0 && attempts >= Math.max(1, maximo - 1)
}

// ── Embudo ──────────────────────────────────────────────────────────────────

export type ProgresoEmbudo = {
  status: string
  attempts: number
  passedCriteria: boolean | null
  /** Nivel del último intento, ya en la clave que lee el frontend (memorized…). */
  nivel: string | null
  /** Criterios que faltaban en el último intento. */
  faltantes: string[]
}

export type SesionDeEmbudo = {
  userId: string
  completedAt: Date | null
  /** Índice de la actividad en la que está el puntero; -1 si no se sabe. */
  punteroIdx: number
  progresos: Map<string, ProgresoEmbudo>
}

export type PasoDelEmbudo = {
  llegaron: number
  completadas: number
  porLimite: number
  promedioIntentos: number
  criterioMasFallado: string | null
  comprension: Record<string, number>
  cuelloDeBotella: boolean
}

/**
 * Un paso del embudo. El cuello de botella se mide sobre los que LLEGARON a la
 * actividad, no sobre todos los que abrieron la lección: a mitad de clase,
 * medir sobre todos marcaba como cuello cada actividad por la que nadie había
 * pasado todavía. Y «avanzó por límite» no cuenta como superada.
 */
export function pasoDelEmbudo(idx: number, actId: string, sesiones: SesionDeEmbudo[]): PasoDelEmbudo {
  let llegaron = 0
  let completadas = 0
  let porLimite = 0
  let sumaIntentos = 0
  let conIntentos = 0
  const comprension: Record<string, number> = { memorized: 0, understood: 0, applied: 0, analyzed: 0 }
  const faltaPorAlumno: Record<string, number> = {}

  for (const s of sesiones) {
    const p = s.progresos.get(actId)
    const llego = !!p || !!s.completedAt || s.punteroIdx >= idx
    if (!llego) continue
    llegaron++
    if (!p) continue
    if (p.attempts > 0) {
      sumaIntentos += p.attempts
      conIntentos++
    }
    if (p.status === 'COMPLETED') {
      completadas++
      if (p.passedCriteria === false) porLimite++
      if (p.nivel && p.nivel in comprension) comprension[p.nivel]++
    }
    // Un criterio por alumno, no por intento: el terco no pesa como cinco.
    for (const c of new Set(p.faltantes)) faltaPorAlumno[c] = (faltaPorAlumno[c] ?? 0) + 1
  }

  const criterioMasFallado =
    Object.entries(faltaPorAlumno).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const superadas = completadas - porLimite
  return {
    llegaron,
    completadas,
    porLimite,
    promedioIntentos: conIntentos ? +(sumaIntentos / conIntentos).toFixed(1) : 0,
    criterioMasFallado,
    comprension,
    cuelloDeBotella: llegaron >= MIN_LLEGARON_CUELLO && superadas / llegaron < 0.5,
  }
}
