/**
 * Centralized grading formula.
 *
 * Single source of truth para la calificación 0-100. La rúbrica
 * (Inicio/Proceso/Logrado/Destacado) se deriva de este número en lib/rubric.ts
 * vía gradeToRubricLevel().
 *
 * MODELO (2026-06-03 v3 — penalty por intentos):
 *
 * SI el estudiante alcanza Logrado (75) o Destacado (100) en algún intento:
 *   score = MEJOR nivel alcanzado × penalty por intentos hasta lograrlo
 *   Penalty:
 *     1-2 intentos: ×1.00  (primer error perdonado — humano)
 *     3 intentos:   ×0.95
 *     4 intentos:   ×0.90
 *     5+ intentos:  ×0.85
 *
 * SI nunca alcanza Logrado (max < 75):
 *   score = PROMEDIO de todos los intentos
 *   (refleja la consistencia en proceso/inicio)
 *
 * Grade final = PROMEDIO de scores de todas las actividades.
 *
 * Filosofía: premia a quien llega al objetivo (Logrado o Destacado), sin
 * castigar demasiado al que tarda 1-2 intentos en llegar. Quien se queda
 * en Proceso/Inicio promedia todo (no se beneficia ni perjudica).
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
 * Score para una actividad. Dos caminos según si alcanzó Logrado/Destacado:
 *
 * 1) Alcanzó Logrado (75) o Destacado (100) en algún intento:
 *    score = mejor nivel × penalty por intentos hasta ese mejor nivel
 *    Premia llegar al objetivo, con tolerancia a 1-2 errores antes.
 *
 * 2) Nunca alcanzó Logrado (max < 75):
 *    score = promedio de todos los intentos
 *    Refleja la consistencia del estudiante en Proceso/Inicio.
 *
 * Penalty por tangentes (>3 ramas) sigue aplicando ×0.9 sobre el resultado.
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

  const maxScore = Math.max(...scoresPerAttempt)
  const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0

  // Camino 1: alcanzó Logrado (75) o más → max × penalty por intentos
  if (maxScore >= 75) {
    const firstReachedIdx = scoresPerAttempt.findIndex((s) => s === maxScore)
    const attemptsToReach = firstReachedIdx + 1
    let attemptPenalty: number
    if (attemptsToReach >= 5) attemptPenalty = 0.85
    else if (attemptsToReach === 4) attemptPenalty = 0.90
    else if (attemptsToReach === 3) attemptPenalty = 0.95
    else attemptPenalty = 1.00 // 1-2 intentos: primer error perdonado
    return Math.round(maxScore * attemptPenalty * tangentPenalty)
  }

  // Camino 2: nunca alcanzó Logrado → promedio
  const avg = scoresPerAttempt.reduce((sum, s) => sum + s, 0) / scoresPerAttempt.length
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
