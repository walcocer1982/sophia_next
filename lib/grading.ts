/**
 * Centralized grading formula.
 *
 * Single source of truth para la calificación 0-100. La rúbrica
 * (Inicio/Proceso/Logrado/Destacado) se deriva de este número en lib/rubric.ts
 * vía gradeToRubricLevel().
 *
 * MODELO (2026-06-03):
 * - El AI evalúa CADA respuesta del estudiante por actividad.
 * - Cada respuesta recibe un understanding_level → score (25/50/75/100).
 * - Score de actividad = PROMEDIO de los scores de todos sus intentos.
 * - Grade final = PROMEDIO de los scores de todas las actividades.
 *
 * Esto refleja la consistencia del estudiante en toda la conversación, no
 * solo el último intento. Un estudiante que arranca mal y termina bien
 * promedia entre los dos extremos.
 */

/** Nivel de dominio que devuelve el AI → score base.
 *
 * Escala discreta 0-25-50-75-100 alineada a los 4 niveles oficiales de
 * la rúbrica peruana (sin sub-categorías):
 *
 * - 25  = memorized   → Inicio    (errores conceptuales)
 * - 50  = understood  → Proceso   (comprende parcialmente)
 * - 75  = applied     → Logrado   (cumple la mayoría de criterios)
 * - 100 = analyzed    → Destacado (va más allá)
 *
 * Para llegar a Logrado, el AI debe clasificar la respuesta como "applied".
 * La generosidad de esa clasificación se controla en activity-verification.ts
 * (cubrir ≥60% de criterios = applied, no understood).
 */
export const COMPREHENSION_SCORES: Record<string, number> = {
  memorized: 25,   // INICIO     (errores o no responde)
  understood: 50,  // PROCESO    (comprende parcialmente, le faltan elementos)
  applied: 75,     // LOGRADO    (cumple la mayoría de criterios)
  analyzed: 100,   // DESTACADO  (analiza, compara, evalúa)
}

/** Minimal shape needed to score an activity. Compatible con ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
}

/**
 * Score para una actividad = PROMEDIO de los scores de TODOS sus intentos.
 *
 * Cada intento (respuesta del estudiante) se evalúa por el AI y recibe un
 * understanding_level (memorized/understood/applied/analyzed → 25/50/75/100).
 * El score de la actividad es el promedio de esos valores.
 *
 * Ejemplo: actividad con 3 intentos [memorized(25), understood(50), applied(75)]
 *   score = (25 + 50 + 75) / 3 = 50 → Proceso
 *
 * Si el estudiante se fue por las ramas (>3 tangentes) se aplica una penalty
 * ligera (×0.9) sobre el promedio.
 *
 * Si no hay intentos registrados, score = 0.
 */
export function activityScore(ap: ScorableActivity): number {
  const evidence = ap.evidenceData as {
    attempts?: Array<{ analysis?: { understanding_level?: string } }>
  } | null
  const attempts = evidence?.attempts || []
  if (attempts.length === 0) return 0

  const scoresPerAttempt = attempts.map((att) => {
    const level = att.analysis?.understanding_level || 'memorized'
    return COMPREHENSION_SCORES[level] ?? 25
  })
  const avg = scoresPerAttempt.reduce((sum, s) => sum + s, 0) / scoresPerAttempt.length

  const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
  return Math.round(avg * tangentPenalty)
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
