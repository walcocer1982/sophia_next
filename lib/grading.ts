/**
 * Centralized grading formula.
 *
 * Single source of truth for the comprehension (70%) + efficiency (30%)
 * scoring used by the student-facing chat, the instructor dashboard and the
 * final evaluation. Previously this formula was copy-pasted in three places
 * (app/api/chat/stream, app/api/dashboard/[courseId], app/api/eval/finish);
 * any divergence silently produced inconsistent grades across surfaces.
 */

/** Comprehension level → base score (0-100). */
export const COMPREHENSION_SCORES: Record<string, number> = {
  memorized: 40,
  understood: 70,
  applied: 85,
  analyzed: 100,
}

/** Efficiency multiplier per attempt (1st..6th+). Minimum ×0.75. */
export const ATTEMPT_PENALTY = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75]

/** Minimal shape needed to score an activity. Compatible with ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
}

/**
 * Score for a single activity: comprehension (70%) + efficiency (30%),
 * where the efficiency portion is also reduced when the student went on
 * too many tangents (>3).
 */
export function activityScore(ap: ScorableActivity): number {
  const evidence = ap.evidenceData as {
    attempts?: Array<{ analysis?: { understanding_level?: string } }>
  } | null
  const lastAttempt = evidence?.attempts?.at(-1)
  const level = lastAttempt?.analysis?.understanding_level || 'memorized'
  const comprehension = COMPREHENSION_SCORES[level] || 40
  const efficiency = ATTEMPT_PENALTY[Math.min(ap.attempts - 1, 5)]
  const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
  return comprehension * 0.7 + comprehension * 0.3 * efficiency * tangentPenalty
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
