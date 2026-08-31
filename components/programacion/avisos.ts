import type { Lesson, Schedule } from './types'

/**
 * Reglas de programación. Se calculan en el cliente sobre lo que ya trae el
 * API: no hacen falta consultas nuevas, y así el aviso aparece mientras se
 * edita, no después de guardar.
 */

/** Minutos que se le dan a una actividad. Salió de la S0: 5 actividades en 2 h
 *  dejaron a un estudiante con un solo mensaje. */
export const MINUTOS_POR_ACTIVIDAD = 45

export interface Aviso {
  tipo: 'choque' | 'ventana' | 'vencida'
  texto: string
}

export function inicio(s: Schedule) {
  return new Date(s.availableAt).getTime()
}
export function fin(s: Schedule) {
  return inicio(s) + s.closesAfterHours * 3_600_000
}

/** Dos sesiones de la misma sección cuyas ventanas se solapan. */
export function choqueCon(
  schedule: Schedule,
  todos: Schedule[],
  lecciones: Lesson[]
): string | null {
  const a1 = inicio(schedule)
  const a2 = fin(schedule)
  for (const otro of todos) {
    if (otro.lessonId === schedule.lessonId) continue
    const b1 = inicio(otro)
    const b2 = fin(otro)
    if (a1 < b2 && b1 < a2) {
      const cual = lecciones.find((l) => l.id === otro.lessonId)
      return cual?.title ?? 'otra sesión'
    }
  }
  return null
}

/** Horas necesarias según cuántas actividades tiene la sesión. */
export function horasSugeridas(actividades: number) {
  if (!actividades) return 0
  return Math.ceil((actividades * MINUTOS_POR_ACTIVIDAD) / 60)
}

export function avisosDe(
  leccion: Lesson,
  schedule: Schedule | undefined,
  todos: Schedule[],
  lecciones: Lesson[],
  ahora = Date.now()
): Aviso[] {
  if (!schedule) return []
  const out: Aviso[] = []

  const otra = choqueCon(schedule, todos, lecciones)
  if (otra) {
    out.push({ tipo: 'choque', texto: `Se cruza con «${otra}»` })
  }

  const necesarias = horasSugeridas(leccion.activityCount ?? 0)
  if (necesarias > 0 && schedule.closesAfterHours < necesarias) {
    out.push({
      tipo: 'ventana',
      texto: `${schedule.closesAfterHours} h para ${leccion.activityCount} actividades — sugerido ${necesarias} h`,
    })
  }

  // Quedó atrás del plan: una sesión posterior ya se dictó antes que esta.
  const mia = lecciones.find((l) => l.id === leccion.id)
  if (mia) {
    const posteriorAntes = todos.some((otro) => {
      const l = lecciones.find((x) => x.id === otro.lessonId)
      return l && l.order > mia.order && inicio(otro) < inicio(schedule)
    })
    if (posteriorAntes && fin(schedule) < ahora) {
      out.push({ tipo: 'vencida', texto: 'Quedó atrás del plan' })
    }
  }

  return out
}

export type EstadoSesion = 'sin-programar' | 'programada' | 'abierta' | 'cerrada'

export function estadoDe(schedule: Schedule | undefined, ahora = Date.now()): EstadoSesion {
  if (!schedule) return 'sin-programar'
  if (ahora < inicio(schedule)) return 'programada'
  if (ahora <= fin(schedule)) return 'abierta'
  return 'cerrada'
}

/** Cuánto falta para que cierre, en texto corto. */
export function faltaPara(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
