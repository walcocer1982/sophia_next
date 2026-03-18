/**
 * Types para estructura de Cursos y Lecciones
 * Arquitectura: Course → Lesson → Activity
 *
 * ACTUALIZADO: 2025-01-20 - Estructura inspirada en Instructoria
 * - Nuevo objeto Teaching separado
 * - SuccessCriteria estructurado (reemplaza criteria[])
 * - Campo complexity para control de extensión
 */

// ============================================
// ESTRUCTURA PRINCIPAL
// ============================================

/**
 * Tipos de actividad - Define el enfoque pedagógico del prompt
 */
export type ActivityType = 'explanation' | 'practice' | 'reflection' | 'closing'

/**
 * Nivel de complejidad - Controla maxTokens y extensión esperada
 */
export type ActivityComplexity = 'simple' | 'moderate' | 'complex'

/**
 * Nivel de comprensión demostrado
 */
export type UnderstandingLevel = 'memorized' | 'understood' | 'applied' | 'analyzed'

/**
 * Tipo de respuesta del estudiante (útil para feedback diferenciado)
 */
export type ResponseType = 'correct' | 'partial' | 'incorrect' | 'off_topic' | 'continuation'

/**
 * Imagen asociada a una actividad
 */
export interface TeachingImage {
  url: string                   // URL de Cloudinary
  description: string           // Descripción obligatoria (la IA usa esto, no interpreta la imagen)
  showWhen?: 'on_start' | 'on_reference' | 'on_demand'
}

/**
 * Instrucciones de enseñanza para el AI (separado de verificación)
 */
export interface Teaching {
  agent_instruction: string     // Instrucción directa al AI sobre qué enseñar
  target_length?: string        // Extensión esperada: "150-300 palabras"
  context?: string              // Contexto adicional: "Sector: X. País: Y"
  image_suggestions?: string[]  // Sugerencias de IA: qué imágenes necesita esta actividad
  image?: TeachingImage         // DEPRECATED: backward compat — usar images[]
  images?: TeachingImage[]      // Múltiples imágenes por actividad (ordenadas)
}

/**
 * Hints opcionales para guiar la verificación
 */
export interface VerificationHints {
  accept_examples?: boolean           // Aceptar ejemplos como respuesta válida
  accept_paraphrase?: boolean         // Aceptar paráfrasis (default: true)
  key_concepts?: string[]             // Conceptos clave que debe mencionar (más flexible que must_include)
  common_mistakes?: string[]          // Errores comunes a detectar
}

/**
 * Criterios de éxito estructurados para verificación automática
 */
export interface SuccessCriteria {
  must_include: string[]                    // Criterios que DEBE cumplir
  min_completeness?: number                 // Porcentaje mínimo (0-100), default: 60
  understanding_level?: UnderstandingLevel  // Nivel esperado, default: 'understood'
  hints?: VerificationHints                 // Hints opcionales para guiar verificación
}

/**
 * Verificación de comprensión del estudiante
 */
export interface Verification {
  question: string              // Pregunta para verificar comprensión
  success_criteria: SuccessCriteria  // Criterios estructurados (reemplaza criteria[])
  max_attempts?: number         // Máximo intentos antes de ofrecer avanzar (default: 3)
  open_ended?: boolean          // Pregunta abierta: evalúa calidad de razonamiento, no keywords específicos
}

/**
 * Actividad de aprendizaje
 */
export interface Activity {
  id: string
  type: ActivityType                   // Tipo de actividad (define template del prompt)
  complexity?: ActivityComplexity      // Controla maxTokens: simple=600, moderate=850, complex=1100
  keyPointIndex: number | null          // Índice del keyPoint en lesson.keyPoints[] (0-indexed, null for closing)
  teaching: Teaching                   // Instrucciones de enseñanza (NUEVO: objeto separado)
  verification: Verification           // Verificación con success_criteria
  commonMistakes?: string[]            // Errores típicos a detectar (no corregir directamente)
  verified?: boolean                   // Marcado como revisado por el profesor en Verificación
}

/**
 * Contexto general de la lección - heredado por todas las actividades
 * Contiene información normativa y técnica de referencia
 *
 * Estructura simplificada para facilitar la creación de contenido
 */
export interface LessonContext {
  pais?: string                   // País de aplicación: "Perú"
  normativa?: string              // Marco legal: "Ley 29783, DS 005-2012-TR"
  referencias?: string[]          // Documentos de referencia
  jerarquia_controles?: string    // Orden de controles (si aplica)
}

/**
 * Contenido de lección (lo que va en contentJson de Prisma)
 */
export interface LessonContent {
  context?: LessonContext         // Contexto general heredado por actividades
  activities: Activity[]
}

/**
 * Curso completo (para archivos de datos)
 */
export interface CourseData {
  id: string
  title: string
  slug: string
  instructor: string      // Personalidad del AI instructor
  isPublished: boolean
  lessons: LessonData[]
}

/**
 * Lección completa (para archivos de datos)
 */
export interface LessonData {
  id: string
  title: string
  slug: string
  objective: string       // Objetivo de la lección
  keyPoints: string[]     // Puntos clave a cubrir
  order: number
  isPublished: boolean
  contentJson: LessonContent
}

// ============================================
// TIPOS DE CONTEXTO Y PROGRESO
// ============================================

/**
 * Contexto de actividad actual con metadata útil
 */
export interface CurrentActivityContext {
  activity: Activity
  activityIdx: number
  totalActivities: number
  isFirstActivity: boolean
  isLastActivity: boolean
  lessonTitle: string
  lessonObjective: string
  lessonKeyPoints: string[]
  courseInstructor: string
}

/**
 * Resultado de verificación de completitud (estructura mejorada)
 */
export interface ActivityCompletionResult {
  completed: boolean
  criteriaMatched: string[]
  criteriaMissing: string[]
  completeness_percentage: number         // 0-100
  understanding_level: UnderstandingLevel // Nivel demostrado
  response_type: ResponseType             // Tipo de respuesta (correct/partial/incorrect/off_topic)
  feedback: string
  confidence: 'high' | 'medium' | 'low'
  ready_to_advance: boolean               // Si puede avanzar a siguiente actividad
}

/**
 * Estado de progreso de actividad
 */
export interface ActivityProgressState {
  activityId: string
  completed: boolean
  completedAt?: Date
  attempts: number
}

// ============================================
// TIPOS DE AGENTES ESPECIALIZADOS
// ============================================

/**
 * Resultado de moderación de contenido
 */
export interface ModerationResult {
  is_safe: boolean
  violations: string[]
  severity: 'none' | 'low' | 'medium' | 'high'
  requires_intervention: boolean
}

/**
 * Clasificación de intención del mensaje del estudiante
 */
export interface IntentClassification {
  intent: 'answer_verification' | 'ask_question' | 'request_clarification' | 'off_topic' | 'small_talk'
  question_type: 'clarification' | 'example_request' | 'application' | 'why_question' | null
  is_on_topic: boolean
  relevance_score: number
  topic_mentioned: string | null
  needs_redirect: boolean
  suggested_response_strategy: 'full_answer' | 'brief_redirect' | 'firm_redirect' | 'acknowledge_answer'
}
