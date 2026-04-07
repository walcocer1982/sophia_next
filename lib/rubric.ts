/**
 * 4-level rubric system for activity evaluation
 * Aligned to Peruvian grading system (base 20, pass = 13/20 = 65/100)
 *
 * | Nivel              | Rango (100) | Equivalente (20) |
 * |--------------------|-------------|------------------|
 * | Logrado Destacado  | 85-100      | 18-20            |
 * | Logrado            | 65-84       | 13-17            |
 * | En Proceso         | 50-64       | 11-12            |
 * | En Inicio          | 0-49        | 0-10             |
 *
 * Passing grade: 65 (= 13/20)
 */

export const GRADE_THRESHOLDS = {
  LOGRADO_DESTACADO: 85,
  LOGRADO: 65,           // Passing grade (13/20)
  EN_PROCESO: 50,
  EN_INICIO: 0,
} as const

export const PASSING_GRADE = GRADE_THRESHOLDS.LOGRADO // 65/100 = 13/20

export type RubricLevel = 'logrado_destacado' | 'logrado' | 'en_proceso' | 'en_inicio'

export interface RubricResult {
  level: RubricLevel
  label: string
  description: string
  color: string // Tailwind color class
}

const RUBRIC_CONFIG: Record<RubricLevel, Omit<RubricResult, 'level'>> = {
  logrado_destacado: {
    label: 'Logrado destacado',
    description: 'Analiza, conecta con experiencia, propone soluciones',
    color: 'text-emerald-700',
  },
  logrado: {
    label: 'Logrado',
    description: 'Comprende y aplica el concepto correctamente',
    color: 'text-blue-700',
  },
  en_proceso: {
    label: 'En proceso',
    description: 'Entiende parcialmente, necesita reforzar',
    color: 'text-amber-700',
  },
  en_inicio: {
    label: 'En inicio',
    description: 'No logró demostrar comprensión del concepto',
    color: 'text-red-600',
  },
}

/**
 * Determine rubric level from activity evidence
 * Uses response_type as fallback when understanding_level lacks variance (all "understood")
 */
export function calculateRubricLevel(
  understandingLevel: string,
  completenessPercentage: number,
  attempts: number,
  passedCriteria: boolean,
  responseType?: string,
): RubricLevel {
  // Forced advance or didn't pass criteria
  if (!passedCriteria) {
    return 'en_inicio'
  }

  // If we have completeness_percentage, use the full logic
  if (completenessPercentage > 0) {
    if (understandingLevel === 'analyzed') return 'logrado_destacado'
    if (understandingLevel === 'applied') {
      return completenessPercentage >= 80 && attempts <= 2 ? 'logrado_destacado' : 'logrado'
    }
    if (understandingLevel === 'understood' && completenessPercentage >= 60) return 'logrado'
    if (understandingLevel === 'memorized') return attempts <= 2 ? 'en_proceso' : 'en_inicio'
    return 'en_proceso'
  }

  // Fallback: use response_type + attempts (for historical data without completeness_percentage)
  const rt = responseType || 'partial'

  if (rt === 'correct') {
    if (attempts <= 2) return 'logrado_destacado'
    if (attempts <= 4) return 'logrado'
    return 'en_proceso'
  }

  if (rt === 'partial') {
    if (attempts <= 2) return 'logrado'
    if (attempts <= 4) return 'en_proceso'
    return 'en_proceso'
  }

  // off_topic or incorrect that somehow passed
  return 'en_inicio'
}

/**
 * Get rubric display info for a level
 */
export function getRubricInfo(level: RubricLevel): RubricResult {
  return { level, ...RUBRIC_CONFIG[level] }
}

/**
 * Calculate overall rubric level for a lesson from activity levels
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
 * Convert numeric grade (0-100) to rubric level
 * Uses Peruvian grading thresholds
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

/**
 * All levels for iteration
 */
export const RUBRIC_LEVELS: RubricLevel[] = ['logrado_destacado', 'logrado', 'en_proceso', 'en_inicio']
