/**
 * Centralized grading formula.
 *
 * Single source of truth para la calificación 0-100. La rúbrica
 * (Inicio/Proceso/Logrado/Destacado) se deriva de este número en lib/rubric.ts
 * vía gradeToRubricLevel().
 *
 * MODELO ACTUAL (2026-06-02):
 * - El AI evalúa cada intento y devuelve understanding_level (= nivel de DOMINIO).
 * - Se aplica un CAP por número de intentos: el primer intento puede llegar
 *   a Destacado, pero a más intentos, el tope baja. Esto premia al que entiende
 *   rápido sin destruir al que necesita corregir.
 * - El grade de la lección = promedio de grades de actividades (calculateGrade).
 */

/** Nivel de dominio que devuelve el AI → score base 0-100. */
export const COMPREHENSION_SCORES: Record<string, number> = {
  memorized: 40,   // EN INICIO    (errores o muy incompleto)
  understood: 60,  // EN PROCESO   (parcial, sin errores graves)
  applied: 80,     // LOGRADO      (cumple criterios)
  analyzed: 100,   // DESTACADO    (va más allá)
}

/**
 * Cap del score según número de intentos.
 * Filosofía: el primer intento puede llegar a Destacado; cada intento adicional
 * baja el techo un escalón. A 4+ intentos, el techo queda en Inicio.
 *
 * Thresholds (gradeToRubricLevel en lib/rubric.ts):
 *   destacado >= 85  |  logrado >= 65  |  proceso >= 50  |  inicio < 50
 *
 * Por eso los caps se eligen JUSTO debajo del threshold superior:
 *   intento 1 → 100 (puede destacado)
 *   intento 2 → 84  (tope logrado, NO destacado)
 *   intento 3 → 64  (tope proceso, NO logrado)
 *   intento 4+ → 49 (tope inicio)
 */
export const ATTEMPT_CAPS = [100, 84, 64, 49]

/** Minimal shape needed to score an activity. Compatible con ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
}

/**
 * Score para una actividad: dominio del objetivo, capado por número de intentos.
 * Si el estudiante se fue por las ramas (>3 tangentes) se aplica una penalty
 * ligera adicional.
 */
export function activityScore(ap: ScorableActivity): number {
  const evidence = ap.evidenceData as {
    attempts?: Array<{ analysis?: { understanding_level?: string } }>
  } | null
  const lastAttempt = evidence?.attempts?.at(-1)
  const level = lastAttempt?.analysis?.understanding_level || 'memorized'
  const baseScore = COMPREHENSION_SCORES[level] ?? 40

  const attempts = Math.max(1, ap.attempts || 1)
  const capIndex = Math.min(attempts - 1, ATTEMPT_CAPS.length - 1)
  const capped = Math.min(baseScore, ATTEMPT_CAPS[capIndex])

  const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
  return Math.round(capped * tangentPenalty)
}

/**
 * Average activity score, rounded to an integer 0-100.
 *
 * @param activities Activities that contribute to the numerator (sum of scores).
 * @param denominator Number to divide by. Defaults to `activities.length`.
 *        Pass the total expected evaluative count to penalize incomplete
 *        sessions (used by the final evaluation).
 */
export function calculateGrade(
  activities: ScorableActivity[],
  denominator?: number,
): number {
  const div = denominator ?? activities.length
  if (div <= 0) return 0
  const total = activities.reduce((sum, ap) => sum + activityScore(ap), 0)
  return Math.round(total / div)
}

/**
 * Grade for the CODE methodology: binary completion, no comprehension rubric.
 * Simply the percentage of expected steps the student completed (0-100).
 */
export function calculateCompletionGrade(
  completed: number,
  total: number,
): number {
  if (total <= 0) return 0
  return Math.round((Math.min(completed, total) / total) * 100)
}
