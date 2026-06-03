/**
 * 4-level rubric system para evaluación de actividades.
 *
 * Escala discreta 0-25-50-75-100. Thresholds en los valores EXACTOS de
 * cada nivel (sin rangos intermedios):
 *
 * | Nivel              | Score requerido | Definición operacional        |
 * |--------------------|-----------------|-------------------------------|
 * | Logrado Destacado  | = 100           | sustenta su respuesta         |
 * | Logrado            | >= 75           | cumple 2+ criterios           |
 * | En Proceso         | >= 50           | intenta pero vago/incompleto  |
 * | En Inicio          | < 50            | básico, monosilábico o nada   |
 *
 * Passing grade: 75 = Logrado.
 *
 * Como el grade es un promedio, valores intermedios (ej: 62) caen al nivel
 * inferior: 62 → Proceso (no llegó a 75 = Logrado).
 *
 * SOURCE OF TRUTH: la rúbrica se deriva del grade numérico calculado en
 * lib/grading.ts. Esta capa solo mapea el número al label.
 */

import { activityScore, type ScorableActivity } from './grading'

export const GRADE_THRESHOLDS = {
  LOGRADO_DESTACADO: 100,  // Score 100 (analyzed) → Destacado
  LOGRADO: 75,             // Score 75 (applied) → Logrado
  EN_PROCESO: 50,          // Score 50 (understood) → Proceso
  EN_INICIO: 0,            // Score 0-49 (memorized=25) → Inicio
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
 * Ese score ya incluye el cap-por-intentos: el primer intento puede llegar
 * a Destacado; intento 2 tope Logrado; 3 tope Proceso; 4+ tope Inicio.
 */
export function calculateRubricLevel(
  ap: ScorableActivity,
  passedCriteria: boolean,
): RubricLevel {
  if (!passedCriteria) return 'en_inicio'
  return gradeToRubricLevel(activityScore(ap))
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
