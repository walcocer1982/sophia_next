import type {
  LessonContent,
  Activity,
  CurrentActivityContext,
} from '@/types/lesson'

/**
 * Parsear y validar contentJson
 */
export function parseContentJson(json: unknown): LessonContent {
  // TODO: Agregar validación con Zod en futuro
  return json as LessonContent
}

/**
 * Obtener actividad actual por ID
 */
export function getCurrentActivity(
  contentJson: LessonContent,
  activityId: string | null
): CurrentActivityContext | null {
  const totalActivities = getTotalActivities(contentJson)
  let currentIndex = 0

  for (let momentIdx = 0; momentIdx < contentJson.moments.length; momentIdx++) {
    const moment = contentJson.moments[momentIdx]

    for (
      let activityIdx = 0;
      activityIdx < moment.activities.length;
      activityIdx++
    ) {
      const activity = moment.activities[activityIdx]
      currentIndex++

      if (!activityId || activity.id === activityId) {
        return {
          activity,
          momentIdx,
          activityIdx,
          totalActivities,
          isFirstActivity: currentIndex === 1,
          isLastActivity: currentIndex === totalActivities,
          lessonMetadata: contentJson.lesson,
        }
      }
    }
  }

  return null
}

/**
 * Obtener siguiente actividad
 */
export function getNextActivity(
  contentJson: LessonContent,
  currentActivityId: string
): CurrentActivityContext | null {
  const current = getCurrentActivity(contentJson, currentActivityId)
  if (!current || current.isLastActivity) {
    return null
  }

  const { momentIdx, activityIdx } = current
  const currentMoment = contentJson.moments[momentIdx]

  // Siguiente actividad en el mismo moment
  if (activityIdx + 1 < currentMoment.activities.length) {
    const nextActivity = currentMoment.activities[activityIdx + 1]
    return getCurrentActivity(contentJson, nextActivity.id)
  }

  // Siguiente moment
  if (momentIdx + 1 < contentJson.moments.length) {
    const nextMoment = contentJson.moments[momentIdx + 1]
    const nextActivity = nextMoment.activities[0]
    return getCurrentActivity(contentJson, nextActivity.id)
  }

  return null
}

/**
 * Contar total de actividades en la lección
 */
export function getTotalActivities(contentJson: LessonContent): number {
  let count = 0
  for (const moment of contentJson.moments) {
    count += moment.activities.length
  }
  return count
}

/**
 * Obtener posición (1-indexed) de una actividad
 */
export function getActivityPosition(
  contentJson: LessonContent,
  activityId: string
): number {
  let position = 0

  for (const moment of contentJson.moments) {
    for (const activity of moment.activities) {
      position++
      if (activity.id === activityId) {
        return position
      }
    }
  }

  return 0
}

/**
 * Obtener primera actividad de la lección
 */
export function getFirstActivity(
  contentJson: LessonContent
): CurrentActivityContext | null {
  if (
    contentJson.moments.length === 0 ||
    contentJson.moments[0].activities.length === 0
  ) {
    return null
  }

  const firstActivity = contentJson.moments[0].activities[0]
  return getCurrentActivity(contentJson, firstActivity.id)
}

/**
 * Validar que un activityId existe en el contentJson
 */
export function activityExists(
  contentJson: LessonContent,
  activityId: string
): boolean {
  for (const moment of contentJson.moments) {
    for (const activity of moment.activities) {
      if (activity.id === activityId) {
        return true
      }
    }
  }
  return false
}
