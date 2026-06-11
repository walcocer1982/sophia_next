/**
 * 4-level rubric system para evaluación de actividades.
 *
 * DOS escalas distintas:
 *
 * 1) NOTA GLOBAL de la lección (promedio 0-100) → bandas definidas por
 *    política de evaluación (2026-06-10):
 *
 *    | Nivel              | Rango 0-100 | En /20      |
 *    |--------------------|-------------|-------------|
 *    | Logrado Destacado  | >= 87.5     | 17.5 - 20   |
 *    | Logrado            | >= 75       | 15 - 17.4   |
 *    | En Proceso         | >= 62.5     | 12.5 - 14.9 |
 *    | En Inicio          | < 62.5      | < 12.5      |
 *
 *    Convención de borde: el límite inferior pertenece al nivel superior
 *    (15.0 es Logrado, 17.5 es Destacado). Passing grade: 75 = 15/20.
 *
 * 2) NIVEL POR ACTIVIDAD: escala discreta 0-25-50-75-100 del evaluador
 *    (memorized/understood/applied/analyzed) → ver calculateRubricLevel.
 *    NO usa las bandas globales: 50 = understood siempre es Proceso.
 *
 * SOURCE OF TRUTH: la rúbrica se deriva del grade numérico calculado en
 * lib/grading.ts. Esta capa solo mapea el número al label.
 */

import { activityScore, type ScorableActivity } from './grading'

export const GRADE_THRESHOLDS = {
  LOGRADO_DESTACADO: 87.5, // 17.5/20 — alcanzable sin perfección absoluta
  LOGRADO: 75,             // 15/20 — passing
  EN_PROCESO: 62.5,        // 12.5/20
  EN_INICIO: 0,
} as const

export const PASSING_GRADE = GRADE_THRESHOLDS.LOGRADO // 75 = applied = Logrado

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
 * Calculate rubric level for a single activity.
 *
 * Delega en activityScore() (lib/grading.ts) para tener UNA fuente de verdad.
 * Mapea la escala DISCRETA por actividad (no las bandas de la nota global):
 * 100 = analyzed → Destacado, >=75 = applied → Logrado,
 * >=50 = understood → Proceso, <50 = memorized → Inicio.
 */
export function calculateRubricLevel(
  ap: ScorableActivity,
  passedCriteria: boolean,
): RubricLevel {
  if (!passedCriteria) return 'en_inicio'
  const score = activityScore(ap)
  if (score >= 100) return 'logrado_destacado'
  if (score >= 75) return 'logrado'
  if (score >= 50) return 'en_proceso'
  return 'en_inicio'
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
 * Convert numeric grade (0-100) to rubric level.
 * Uses Peruvian grading thresholds.
 */
export function gradeToRubricLevel(grade: number): RubricLevel {
  if (grade >= GRADE_THRESHOLDS.LOGRADO_DESTACADO) return 'logrado_destacado'
  if (grade >= GRADE_THRESHOLDS.LOGRADO) return 'logrado'
  if (grade >= GRADE_THRESHOLDS.EN_PROCESO) return 'en_proceso'
  return 'en_inicio'
}

/**
 * Check if a grade is passing (>= 65 = 13/20)
 */
export function isPassing(grade: number): boolean {
  return grade >= PASSING_GRADE
}

export const RUBRIC_LEVELS: RubricLevel[] = ['logrado_destacado', 'logrado', 'en_proceso', 'en_inicio']
