/**
 * Lo que la API del Monitor por curso devuelve al navegador
 * (`GET /api/dashboard/[courseId]`). Fechas en ISO: viajan por JSON.
 */
import type { Avance, EstadoVivo } from '@/lib/monitor'

export type MarcaDTO = {
  estado: string
  /** «No responde · J. Canchiz · 30 set», listo para pintar. */
  texto: string
  autor: string
  fecha: string
}

export type FilaMonitor = {
  userId: string
  name: string | null
  email: string | null
  sessionId: string
  /** La sección del alumno en este curso: con la lección, dice si la fila es del bloque abierto. */
  sectionId: string
  lessonId: string
  lessonTitle: string
  estado: EstadoVivo
  avance: Avance
  activityIndex: number | null
  activityTotal: number | null
  activityTitle: string | null
  percentage: number
  startedAt: string
  lastActivityAt: string
  /** Cierre de la ventana para la sección del alumno; null si la lección no tiene horario. */
  cierre: string | null
  /** Último mensaje menos inicio: es la duración de la sesión, no tiempo trabajando. */
  minutos: number
  messageCount: number
  grade: number | null
  nivel: string | null
  /** Intentos en la actividad actual; `aviso` a uno del tope, que es cuando aún se puede intervenir. */
  intentos: { actuales: number; maximo: number; aviso: boolean } | null
  criterioFaltante: string | null
  /** La última actividad que el código avanzó por agotar intentos. */
  porLimite: { index: number; title: string } | null
  /** La sesión quedó antes de que se abriera la ventana actual (se reabrió la lección): no va en la vista en vivo. */
  deVentanaAnterior: boolean
  /** Actividades cerradas en que el alumno nunca tocó la línea que respalda su respuesta (lectura comprobada, 21 oct 2026). */
  lecturaSinComprobar: { index: number; title: string }[]
  seguimiento: MarcaDTO | null
}

export type LeccionPendiente = {
  lessonId: string
  lessonTitle: string
  estado: 'no-entro' | 'a-medias' | 'sin-avanzar'
  /** El evento que dispara la alerta: último mensaje, o cierre de la ventana si no entró. */
  fecha: string
  activityIndex: number | null
  activityTotal: number | null
}

export type PendienteMonitor = {
  userId: string
  name: string | null
  email: string | null
  phone: string | null
  seguimiento: MarcaDTO | null
  lecciones: LeccionPendiente[]
}

export type PasoEmbudoDTO = {
  id: string
  index: number
  title: string
  total: number
  percentage: number
  llegaron: number
  completadas: number
  porLimite: number
  promedioIntentos: number
  criterioMasFallado: string | null
  comprension: Record<string, number>
  cuelloDeBotella: boolean
}

export type EmbudoLeccion = {
  lessonId: string
  lessonTitle: string
  totalStudents: number
  funnel: PasoEmbudoDTO[]
}

export type RespuestaMonitor = {
  course: {
    id: string
    title: string
    career: { id: string; name: string } | null
    instructor: string
  }
  viendoComo: string | null
  sections: Array<{ id: string; name: string; period: { name: string }; _count: { enrollments: number } }>
  /** Alguna sección visible tiene una ventana abierta ahora mismo. */
  enVivo: boolean
  /** Las ventanas abiertas ahora, una por sección y sesión: de aquí sale el botón para terminar el bloque. */
  bloquesAbiertos: Array<{
    sectionId: string
    sectionName: string
    lessonId: string
    lessonOrder: number
    lessonTitle: string
    cierra: string
    /** Matriculados de la sección que se esperan (sin «desertó»). */
    esperados: number
    /** Los que aún no abren la sesión en esta ventana (26 oct 2026). */
    noEntraron: Array<{ userId: string; name: string | null }>
  }>
  filas: FilaMonitor[]
  pendientes: PendienteMonitor[]
  funnels: EmbudoLeccion[]
}
