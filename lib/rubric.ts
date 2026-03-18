/**
 * 4-level rubric system for activity evaluation
 * Replaces/complements numeric grades with meaningful levels
 */

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
 * All levels for iteration
 */
export const RUBRIC_LEVELS: RubricLevel[] = ['logrado_destacado', 'logrado', 'en_proceso', 'en_inicio']
