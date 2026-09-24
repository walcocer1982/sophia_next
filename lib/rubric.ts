/**
 * Rúbrica de 4 niveles — UNA sola escala para la actividad y para la lección.
 *
 * Bandas de la política de evaluación (2026-06-23), en /20 y en /100:
 *
 *    | Nivel              | En /20    | En /100    |
 *    |--------------------|-----------|------------|
 *    | Logrado Destacado  | 15 a 20   | 75 a 100   |
 *    | Logrado            | 10 a < 15 | 50 a < 75  |
 *    | En Proceso         | 5 a < 10  | 25 a < 50  |
 *    | En Inicio          | 0 a < 5   | 0 a < 25   |
 *
 * Convención de borde: el límite inferior pertenece al nivel superior
 * (5 es Proceso, 10 es Logrado, 15 es Destacado). Aprobar: 50 = 10/20.
 *
 * Hasta el 14 set 2026 había DOS escalas: la actividad puntuaba 25/50/75/100 y
 * la lección se leía con estas bandas, así que «Logrado» en cada actividad (75)
 * se convertía en «Logrado destacado» al promediar, y quien agotaba intentos
 * (tope 50) aprobaba. Ahora cada nivel de actividad vale el PUNTO MEDIO de su
 * banda (lib/grading.ts → COMPREHENSION_SCORES) y el mismo mapeo numérico
 * sirve para la actividad y para la lección: gradeToRubricLevel().
 */

import { activityScore, type ScorableActivity } from './grading'

export const GRADE_THRESHOLDS = {
  LOGRADO_DESTACADO: 75, // 15/20
  LOGRADO: 50,           // 10/20 — aprobado
  EN_PROCESO: 25,        // 5/20
  EN_INICIO: 0,
} as const

export const PASSING_GRADE = GRADE_THRESHOLDS.LOGRADO // 50 = 10/20 = Logrado

/**
 * Completitud mínima (0-100) que una actividad exige para «cumplir» cuando el
 * diseñador no fijó otra. Antes había dos defaults (60 en el prompt del tutor,
 * 50 en el verificador) para la misma actividad.
 */
export const DEFAULT_MIN_COMPLETENESS = 50

export type RubricLevel = 'logrado_destacado' | 'logrado' | 'en_proceso' | 'en_inicio'

export interface RubricResult {
  level: RubricLevel
  label: string
  description: string
  color: string
}

const RUBRIC_CONFIG: Record<RubricLevel, Omit<RubricResult, 'level'>> = {
  logrado_destacado: {
    label: 'Logrado destacado',
    description: 'Va más allá: aporta ejemplo, conecta o profundiza',
    color: 'text-emerald-700',
  },
  logrado: {
    label: 'Logrado',
    description: 'Cumple los criterios de la actividad',
    color: 'text-blue-700',
  },
  en_proceso: {
    label: 'En proceso',
    description: 'Parcialmente correcta — le faltan elementos clave',
    color: 'text-amber-700',
  },
  en_inicio: {
    label: 'En inicio',
    description: 'Errores conceptuales o muy incompleta',
    color: 'text-red-600',
  },
}

/**
 * Nivel de UNA actividad. Se deriva del mismo número que la nota
 * (activityScore, que ya incluye el tope por intentos agotados y los
 * criterios eliminatorios) y se lee con las MISMAS bandas que la lección.
 *
 * Devuelve null cuando la evidencia no permite afirmar nada (intento sin
 * verificar): el tablero muestra «sin evaluar», no «en inicio».
 */
export function calculateRubricLevel(ap: ScorableActivity): RubricLevel | null {
  const score = activityScore(ap)
  if (score === null) return null
  return gradeToRubricLevel(score)
}

/**
 * Get rubric display info for a level
 */
export function getRubricInfo(level: RubricLevel): RubricResult {
  return { level, ...RUBRIC_CONFIG[level] }
}

/**
 * Overall rubric level para una lección a partir de los niveles de sus actividades.
 * Usa promedio numérico de los niveles (1-4) en lugar de moda, para suavizar.
 */
export function calculateOverallRubric(activityLevels: RubricLevel[]): RubricLevel {
  if (activityLevels.length === 0) return 'en_inicio'

  const scores: Record<RubricLevel, number> = {
    logrado_destacado: 4,
    logrado: 3,
    en_proceso: 2,
    en_inicio: 1,
  }

  const avg = activityLevels.reduce((sum, l) => sum + scores[l], 0) / activityLevels.length

  if (avg >= 3.5) return 'logrado_destacado'
  if (avg >= 2.5) return 'logrado'
  if (avg >= 1.5) return 'en_proceso'
  return 'en_inicio'
}

/**
 * Número (0-100) → nivel. Único mapeo, para actividades y para lecciones.
 */
export function gradeToRubricLevel(grade: number): RubricLevel {
  if (grade >= GRADE_THRESHOLDS.LOGRADO_DESTACADO) return 'logrado_destacado'
  if (grade >= GRADE_THRESHOLDS.LOGRADO) return 'logrado'
  if (grade >= GRADE_THRESHOLDS.EN_PROCESO) return 'en_proceso'
  return 'en_inicio'
}

/**
 * Check if a grade is passing (>= 50/100 = 10/20 = Logrado)
 */
export function isPassing(grade: number): boolean {
  return grade >= PASSING_GRADE
}

export const RUBRIC_LEVELS: RubricLevel[] = ['logrado_destacado', 'logrado', 'en_proceso', 'en_inicio']
