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

  for (let classIdx = 0; classIdx < contentJson.classes.length; classIdx++) {
    const currentClass = contentJson.classes[classIdx]

    for (
      let momentIdx = 0;
      momentIdx < currentClass.moments.length;
      momentIdx++
    ) {
      const moment = currentClass.moments[momentIdx]

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
            classIdx,
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

  const { classIdx, momentIdx, activityIdx } = current
  const currentClass = contentJson.classes[classIdx]
  const currentMoment = currentClass.moments[momentIdx]

  // Siguiente actividad en el mismo moment
  if (activityIdx + 1 < currentMoment.activities.length) {
    const nextActivity = currentMoment.activities[activityIdx + 1]
    return getCurrentActivity(contentJson, nextActivity.id)
  }

  // Siguiente moment en la misma class
  if (momentIdx + 1 < currentClass.moments.length) {
    const nextMoment = currentClass.moments[momentIdx + 1]
    const nextActivity = nextMoment.activities[0]
    return getCurrentActivity(contentJson, nextActivity.id)
  }

  // Siguiente class
  if (classIdx + 1 < contentJson.classes.length) {
    const nextClass = contentJson.classes[classIdx + 1]
    const nextMoment = nextClass.moments[0]
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
  for (const cls of contentJson.classes) {
    for (const moment of cls.moments) {
      count += moment.activities.length
    }
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

  for (const cls of contentJson.classes) {
    for (const moment of cls.moments) {
      for (const activity of moment.activities) {
        position++
        if (activity.id === activityId) {
          return position
        }
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
    contentJson.classes.length === 0 ||
    contentJson.classes[0].moments.length === 0 ||
    contentJson.classes[0].moments[0].activities.length === 0
  ) {
    return null
  }

  const firstActivity = contentJson.classes[0].moments[0].activities[0]
  return getCurrentActivity(contentJson, firstActivity.id)
}

/**
 * Validar que un activityId existe en el contentJson
 */
export function activityExists(
  contentJson: LessonContent,
  activityId: string
): boolean {
  for (const cls of contentJson.classes) {
    for (const moment of cls.moments) {
      for (const activity of moment.activities) {
        if (activity.id === activityId) {
          return true
        }
      }
    }
  }
  return false
}
