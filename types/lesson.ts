/**
 * Types para estructura de lecciones (contentJson)
 * Basado en schema de prisma/seed.ts
 */

export interface TeachingContent {
  main_topic: string
  key_points: string[]
  approach: 'conversational' | 'practical'
}

export interface VerificationCriteria {
  question: string
  criteria: string[]
  target_length: 'short' | 'medium' | 'long'
  hints?: string[]
}

export interface StudentQuestionsPolicy {
  approach: 'answer_then_redirect'
  max_tangent_responses: number
}

export interface Guardrail {
  trigger: string
  response: string
}

export interface Activity {
  id: string
  type: 'explanation' | 'practice'
  teaching: TeachingContent
  verification: VerificationCriteria
  student_questions: StudentQuestionsPolicy
  guardrails?: Guardrail[]
}

export interface Moment {
  id: string
  title: string
  activities: Activity[]
}

export interface LessonMetadata {
  title: string
  description: string
  duration_minutes: number
}

export interface LessonContent {
  id?: string // Optional para compatibilidad con DB y hardcoded
  lesson: LessonMetadata
  moments: Moment[]
}

/**
 * Context de actividad actual con metadata útil
 */
export interface CurrentActivityContext {
  activity: Activity
  momentIdx: number
  activityIdx: number
  totalActivities: number
  isFirstActivity: boolean
  isLastActivity: boolean
  lessonMetadata: LessonMetadata
}

/**
 * Resultado de verificación de completitud
 */
export interface ActivityCompletionResult {
  completed: boolean
  criteriaMatched: string[]
  criteriaMissing: string[]
  feedback: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Estado de progreso de actividad
 */
export interface ActivityProgressState {
  activityId: string
  completed: boolean
  completedAt?: Date
  attempts: number
  hintsUsed: number
}
