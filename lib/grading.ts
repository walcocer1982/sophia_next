/**
 * Centralized grading formula.
 *
 * Single source of truth para la calificación 0-100. La rúbrica
 * (Inicio/Proceso/Logrado/Destacado) se deriva de este número en lib/rubric.ts
 * vía gradeToRubricLevel().
 *
 * MODELO ACTUAL (2026-06-02 — escalada):
 * - El AI evalúa cada respuesta y devuelve understanding_level.
 * - Cuando la respuesta es parcial/cero, Sophia desglosa con sub-preguntas
 *   (hasta 3, o 1 para reflection). El nivel del estudiante puede ESCALAR
 *   con cada sub-respuesta: Inicio → Proceso → Logrado.
 * - Destacado solo se logra al 1er disparo, sin desglose.
 * - El grade final usa el nivel ESCALADO (último understanding_level registrado).
 * - El cap-by-attempts del modelo anterior se elimina: ya no hace falta porque
 *   la escalada se autorregula en el nivel.
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
 * Score para una actividad: dominio del objetivo (nivel escalado).
 * Si el estudiante se fue por las ramas (>3 tangentes) se aplica una penalty
 * ligera. El conteo de attempts es informativo (se ve en el dashboard) pero
 * NO castiga el score — la escalada ya regula via understanding_level.
 */
export function activityScore(ap: ScorableActivity): number {
  const evidence = ap.evidenceData as {
    attempts?: Array<{ analysis?: { understanding_level?: string } }>
  } | null
  const lastAttempt = evidence?.attempts?.at(-1)
  const level = lastAttempt?.analysis?.understanding_level || 'memorized'
  const baseScore = COMPREHENSION_SCORES[level] ?? 40

  const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
  return Math.round(baseScore * tangentPenalty)
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
