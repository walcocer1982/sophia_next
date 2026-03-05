import type {
  LessonContent,
  Activity,
  CurrentActivityContext,
  LessonContext,
} from '@/types/lesson'

/**
 * Parsear y validar contentJson de una lección
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
  activityId: string | null,
  lessonTitle: string,
  lessonObjective: string,
  lessonKeyPoints: string[],
  courseInstructor: string
): CurrentActivityContext | null {
  const activities = contentJson.activities
  const totalActivities = activities.length

  for (let activityIdx = 0; activityIdx < activities.length; activityIdx++) {
    const activity = activities[activityIdx]

    if (!activityId || activity.id === activityId) {
      return {
        activity,
        activityIdx,
        totalActivities,
        isFirstActivity: activityIdx === 0,
        isLastActivity: activityIdx === totalActivities - 1,
        lessonTitle,
        lessonObjective,
        lessonKeyPoints,
        courseInstructor,
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
): { activityId: string } | null {
  const activities = contentJson.activities
  const currentIndex = activities.findIndex(a => a.id === currentActivityId)

  if (currentIndex === -1 || currentIndex === activities.length - 1) {
    return null
  }

  return {
    activityId: activities[currentIndex + 1].id,
  }
}

/**
 * Contar total de actividades en la lección
 */
export function getTotalActivities(contentJson: LessonContent): number {
  return contentJson.activities.length
}

/**
 * Obtener posición (1-indexed) de una actividad
 */
export function getActivityPosition(
  contentJson: LessonContent,
  activityId: string
): number {
  const index = contentJson.activities.findIndex(a => a.id === activityId)
  return index === -1 ? 0 : index + 1
}

/**
 * Obtener primera actividad de la lección
 */
export function getFirstActivity(
  contentJson: LessonContent
): { activityId: string } | null {
  if (contentJson.activities.length === 0) {
    return null
  }

  return {
    activityId: contentJson.activities[0].id,
  }
}

/**
 * Obtener actividad por ID (sin contexto adicional)
 */
export function getActivityById(
  contentJson: LessonContent,
  activityId: string
): Activity | null {
  return contentJson.activities.find(a => a.id === activityId) || null
}

/**
 * Validar que un activityId existe en el contentJson
 */
export function activityExists(
  contentJson: LessonContent,
  activityId: string
): boolean {
  return getActivityById(contentJson, activityId) !== null
}

/**
 * Obtener el keyPoint de una actividad desde el array de keyPoints de la lección
 */
export function getKeyPointForActivity(
  activity: Activity,
  lessonKeyPoints: string[]
): string {
  if (activity.keyPointIndex === null) return 'Cierre'
  return lessonKeyPoints[activity.keyPointIndex] || `Punto ${activity.keyPointIndex + 1}`
}

/**
 * Verificar si una actividad es la última de la lección
 */
export function isLastActivity(
  contentJson: LessonContent,
  activityId: string
): boolean {
  const activities = contentJson.activities
  if (activities.length === 0) return false
  return activities[activities.length - 1].id === activityId
}

/**
 * Calcular porcentaje de progreso basado en actividades completadas
 */
export function calculateProgressPercentage(
  completedCount: number,
  totalActivities: number
): number {
  if (totalActivities === 0) return 0
  return Math.round((completedCount / totalActivities) * 100)
}

/**
 * Obtener contexto general de la lección (normativo, técnico, etc.)
 * Este contexto se hereda a todas las actividades
 */
export function getLessonContext(contentJson: LessonContent): LessonContext | undefined {
  return contentJson.context
}
