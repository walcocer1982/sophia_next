import type { UnderstandingLevel } from '@/types/lesson'
import { normalizeLevel } from '@/lib/levels'

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
 * - 25  = beginning    → Inicio    (errores conceptuales)
 * - 50  = developing   → Proceso   (comprende parcialmente)
 * - 75  = achieved     → Logrado   (cumple la mayoría de criterios)
 * - 100 = outstanding  → Destacado (va más allá)
 *
 * Para llegar a Logrado, el AI debe clasificar la respuesta como "achieved".
 * Los niveles se leen con normalizeLevel(), así que los registros históricos
 * (memorized/understood/applied/analyzed) puntúan igual que siempre.
 */
export const COMPREHENSION_SCORES: Record<UnderstandingLevel, number> = {
  beginning: 25,    // INICIO     (errores o no responde)
  developing: 50,   // PROCESO    (comprende parcialmente, le faltan elementos)
  achieved: 75,     // LOGRADO    (cumple la mayoría de criterios)
  outstanding: 100, // DESTACADO  (analiza, compara, evalúa)
}

/** Minimal shape needed to score an activity. Compatible con ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
  /** Tipo de actividad — usado para asignar peso default si no hay override. */
  activityType?: 'explanation' | 'practice' | 'reflection' | 'closing'
  /** Override manual del peso (0-10). Si no se setea, se usa el default por tipo. */
  weight?: number | null
}

/** Peso default por tipo de actividad en el promedio ponderado de la lección.
 *
 * Las primeras actividades suelen ser de activación/exposición (peso bajo);
 * las últimas son de aplicación + síntesis (peso alto). El diseñador puede
 * override con el campo `weight` por actividad. 0 = no aporta a la nota.
 */
const DEFAULT_WEIGHT_BY_TYPE: Record<NonNullable<ScorableActivity['activityType']>, number> = {
  explanation: 1, // activación / exposición — pesa menos
  reflection: 2,  // categorización / pensar sin aplicar
  practice: 3,    // aplicación concreta — donde se ve si entendió
  closing: 4,     // síntesis final — integra todo
}

/** Devuelve el peso efectivo de una actividad para el promedio ponderado. */
export function getActivityWeight(ap: ScorableActivity): number {
  if (typeof ap.weight === 'number' && ap.weight >= 0) return ap.weight
  if (ap.activityType && DEFAULT_WEIGHT_BY_TYPE[ap.activityType]) {
    return DEFAULT_WEIGHT_BY_TYPE[ap.activityType]
  }
  return 1 // fallback si no hay tipo conocido
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
    const level = normalizeLevel(att.analysis?.understanding_level)
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
 * Weighted grade across activities, rounded to an integer 0-100.
 *
 * Promedio ponderado: cada actividad aporta `score × weight`, dividido por la
 * suma de pesos. Si ninguna actividad tiene weight/activityType, el resultado
 * es idéntico al promedio simple anterior (todas pesan 1).
 *
 * @param activities  Activities to evaluate. Cada una contribuye con su peso.
 * @param denominator Override del denominador (suma de pesos). Útil para
 *        penalizar sesiones incompletas: pasás la suma de pesos ESPERADA
 *        aunque algunas actividades no se hayan completado todavía.
 */
export function calculateGrade(
  activities: ScorableActivity[],
  denominator?: number,
): number {
  if (activities.length === 0 && (denominator ?? 0) <= 0) return 0

  // Numerador: suma de (score × peso)
  const weightedSum = activities.reduce(
    (sum, ap) => sum + activityScore(ap) * getActivityWeight(ap),
    0,
  )

  // Denominador: override o suma de pesos de las actividades
  const totalWeight =
    denominator ??
    activities.reduce((sum, ap) => sum + getActivityWeight(ap), 0)

  if (totalWeight <= 0) return 0
  return Math.round(weightedSum / totalWeight)
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
