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
// Escala de logro (mapea 1:1 a inicio/proceso/logrado/destacado).
// Antes era la escala cognitiva (memorized/understood/applied/analyzed); ver
// lib/levels.ts → normalizeLevel para la compatibilidad con datos históricos.
export type UnderstandingLevel = 'beginning' | 'developing' | 'achieved' | 'outstanding'

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
  /**
   * Pregunta con que se ABRE la actividad cuando no es la de verificación.
   * En una actividad con ecualizador se abre con la predicción («¿qué crees que
   * pasa si…?») y el porqué de `verification.question` llega al final (spec del
   * panel §16.4). La usan la bienvenida, la transición y la retención del avance.
   */
  first_question?: string
  image?: TeachingImage         // DEPRECATED: backward compat — usar blocks
  images?: TeachingImage[]      // DEPRECATED: backward compat — usar blocks
  blocks?: SupportBlock[]       // Material de apoyo del panel (investigacion/panel-de-apoyo-especificacion.md)
}

// ============================================
// MATERIAL DE APOYO (panel derecho de /learn)
// ============================================
// La lección declara bloques tipados; Sophia los cita por su título y no los
// reescribe en el chat; el alumno los tiene a la vista mientras responde.
// Especificación: investigacion/panel-de-apoyo-especificacion.md

export type SupportBlockType = 'image' | 'compare' | 'formula' | 'table' | 'text' | 'case' | 'diagram' | 'simulator'
export type ShowWhen = 'on_start' | 'on_reference' | 'on_demand'

export interface SupportBlockBase {
  id: string                 // único en la lección, estable: Sophia lo usa para citarlo
  type: SupportBlockType
  title: string              // lo que Sophia dice: «mira la tabla "Semáforo de faltas"»
  showWhen?: ShowWhen        // default on_start
  pinned?: boolean           // sigue visible en las actividades siguientes
  forVerifier?: boolean      // el verificador recibe el contenido completo
  source?: string            // procedencia: «Reglamento Interno v03, Art. 40»
}

export interface ImageMarker {
  n: number                  // número que se dibuja (1, 2, 3…)
  x: number                  // 0–100, porcentaje del ancho de la imagen
  y: number                  // 0–100, porcentaje del alto
  label: string              // qué explica el señalamiento
  showWhen?: ShowWhen        // on_reference: aparece cuando Sophia lo cita
}

export interface ImageBlock extends SupportBlockBase {
  type: 'image'
  url: string
  description: string        // lo único que Sophia "ve" de la imagen
  /** scene: escena de caso (no señala el peligro) · term: palabra técnica · equipment: equipo o cosa física · diagram: esquema subido */
  kind: 'scene' | 'term' | 'equipment' | 'diagram'
  license: string
  validated: boolean         // solo las validadas se muestran al alumno
  markers?: ImageMarker[]
  bankId?: string
}

export interface CompareBlock extends SupportBlockBase {
  type: 'compare'
  /** 2 o 3 imágenes; los pies son neutros («Trabajador 1»): no revelan la respuesta */
  items: { url: string; description: string; caption: string; license: string }[]
}

export interface FormulaBlock extends SupportBlockBase {
  type: 'formula'
  expression: string         // texto plano: «nota final = CV × 10 % + …»
  terms?: { symbol: string; meaning: string; value?: string }[]
  example?: {
    label: string            // «Pedro»
    rows: { term: string; value: string; weight: string; result: string }[]
    total: string            // «13,65 → 14»
  }
}

export interface TableBlock extends SupportBlockBase {
  type: 'table'
  columns: string[]
  rows: string[][]
  highlight?: { rows?: number[]; cols?: number[] }
  legend?: string
}

export interface TextBlock extends SupportBlockBase {
  type: 'text'
  body: string               // Markdown simple (negrita, listas numeradas)
  kind?: 'fragment' | 'consigna' | 'norma' | 'rubrica'
}

export interface CaseBlock extends SupportBlockBase {
  type: 'case'
  name: string               // «Rosa»
  facts: string[]            // datos fijos, uno por línea
  question?: string
}

/**
 * Ecualizador (spec del panel §16.2): una barra por variable, el peso visible,
 * el resultado en vivo. El alumno mueve y cuenta qué pasó; no calcula.
 */
export interface SimulatorBlock extends SupportBlockBase {
  type: 'simulator'
  kind: 'weighted_sum'
  /** Variables en el orden en que se dibujan. `weight` en porcentaje; suman 100. */
  variables: { id: string; label: string; weight: number; min?: number; max?: number; step?: number }[]
  /** Escala del resultado: 0–20, aprueba con 13, 12,5 redondea a 13. */
  scale: { min: number; max: number; pass: number; round?: 'half_up' | 'none' }
  /** Casos precargados («Ana», «Rosa»). El primero es el que abre. */
  presets: { label: string; values: Record<string, number> }[]
  /** Botón «Mis notas»: el alumno escribe las suyas. No se guardan (decisión 14). */
  allowOwnValues?: boolean
  labels?: { pass: string; fail: string }
}

export interface DiagramBlock extends SupportBlockBase {
  type: 'diagram'
  kind: 'flow' | 'cycle' | 'hierarchy' | 'timeline'
  nodes: { id: string; label: string; note?: string }[]
  edges?: { from: string; to: string; label?: string }[]
  parent?: Record<string, string>
}

export type SupportBlock =
  | ImageBlock
  | CompareBlock
  | FormulaBlock
  | TableBlock
  | TextBlock
  | CaseBlock
  | DiagramBlock
  | SimulatorBlock

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
  min_completeness?: number                 // Porcentaje mínimo (0-100); default en lib/rubric.ts
  understanding_level?: UnderstandingLevel  // Nivel esperado, default: 'developing'
  hints?: VerificationHints                 // Hints opcionales para guiar verificación
  /**
   * Criterios ELIMINATORIOS: índices 1-based dentro de must_include.
   * Sin ellos la actividad no se considera cumplida aunque se cubra el resto,
   * Sophia nunca los revela ni los explica (ni al agotar intentos), y la
   * calificación de la actividad queda en «En inicio» si nunca se cubrieron.
   * Pensado para lo que en campo no admite error (seguridad, norma).
   */
  critical?: number[]
  /**
   * Criterios cuyas frases deben salir de un bloque del panel (spec del panel §8):
   * «lista cuatro frases del fragmento» exige que existan en el fragmento.
   * `criterion` 1-based en must_include; `block` id del bloque; `min` cuántas
   * frases distintas del bloque (por defecto 1). Ver lib/quote-check.ts.
   */
  quote_from?: { criterion: number; block: string; min?: number }[]
}

/**
 * Niveles de logro (escala en inglés, mapean 1:1 al español):
 * beginning=inicio · developing=proceso · achieved=logrado · outstanding=destacado
 */
export type RubricLevel = 'beginning' | 'developing' | 'achieved' | 'outstanding'

/**
 * Rúbrica: respuesta-EJEMPLO de un estudiante en cada nivel de logro.
 * Son ANCLAS de calibración (no la única respuesta válida), generadas por el
 * modelo una sola vez al publicar la lección. El verificador compara la
 * respuesta del alumno contra estas referencias.
 */
export type Rubric = Record<RubricLevel, string>

/**
 * Pista de andamiaje pre-generada para un criterio (por índice en must_include).
 * Induce hacia el criterio sin revelar la respuesta.
 */
export interface ScaffoldHint {
  criterion: number   // índice en success_criteria.must_include
  hint: string
}

/**
 * Verificación de comprensión del estudiante
 */
export interface Verification {
  question: string              // Pregunta para verificar comprensión
  success_criteria: SuccessCriteria  // Criterios estructurados (reemplaza criteria[])
  max_attempts?: number         // Máximo intentos antes de ofrecer avanzar (default: 3)
  open_ended?: boolean          // Pregunta abierta: evalúa calidad de razonamiento, no keywords específicos
  is_evaluative?: boolean       // Si false: solo participación, no cuenta para nota. Default: true
  rubric?: Rubric               // 🆕 Respuestas-referencia por nivel (auto-generadas al publicar)
  scaffold_hints?: ScaffoldHint[]  // 🆕 Pistas por criterio (auto-generadas)
}

/**
 * Paso cerrado de una actividad (alternativas). Se presenta ANTES de la
 * pregunta abierta de `verification` y se corrige en el código, sin modelo:
 * baja el embudo de la primera respuesta («sí, estoy listo», «tú dime») y da
 * una nota confiable. Las opciones se mezclan por sesión (ver lib/choice.ts).
 */
export interface ChoiceStep {
  prompt: string          // Enunciado de la pregunta cerrada
  options: string[]       // 2 a 5 opciones, sin letra
  answer: number          // Índice 0-based de la opción correcta
  max_attempts?: number   // Intentos antes de revelar la correcta (default 2)
}

/**
 * Actividad de aprendizaje
 */
export interface Activity {
  id: string
  type: ActivityType                   // Tipo de actividad (define template del prompt)
  /**
   * Paso 1 (opcional): pregunta cerrada que se corrige en el código. Si existe,
   * la pregunta abierta de `verification` es el paso 2 («¿por qué esa?»).
   */
  choice?: ChoiceStep
  /**
   * Comprobación de cierre (spec del panel §16.1, decisión 15): 2 a 4 preguntas
   * cerradas sin porqué, corregidas en código, antes de la reflexión. Solo en
   * `closing`; una actividad con `checks` no lleva `choice`. Cuenta como una
   * fila propia de peso 1 en la nota (lib/grading.ts).
   */
  checks?: ChoiceStep[]
  complexity?: ActivityComplexity      // Controla maxTokens: simple=600, moderate=850, complex=1100
  keyPointIndex: number | null          // Índice del keyPoint en lesson.keyPoints[] (0-indexed, null for closing)
  /**
   * Peso de la actividad en el promedio ponderado de la nota final (0-10).
   * Si no se setea, se aplica el default por tipo:
   *   explanation=1, reflection=2, practice=3, closing=4
   * Ver lib/grading.ts → getActivityWeight().
   */
  weight?: number
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
 *
 * Escalada (2026-06-02): el AI puede sugerir desglosar la pregunta cuando la
 * respuesta es parcial/cero. El estudiante puede escalar hasta Logrado vía
 * sub-preguntas (variante laxa). Destacado solo se logra al 1er disparo.
 */
export interface ActivityCompletionResult {
  /** El modelo vio que la respuesta va MÁS ALLÁ de los criterios (→ destacado). */
  goes_beyond?: boolean
  /** Completitud que estimó el modelo; la usada (`completeness_percentage`) se deriva de los criterios. */
  completeness_reported?: number
  completed: boolean
  criteriaMatched: string[]
  criteriaMissing: string[]
  completeness_percentage: number         // 0-100
  understanding_level: UnderstandingLevel // Nivel demostrado (inicio/proceso/logrado/destacado)
  response_type: ResponseType             // Tipo de respuesta (correct/partial/incorrect/off_topic)
  feedback: string
  confidence: 'high' | 'medium' | 'low'
  ready_to_advance: boolean               // Si puede avanzar a siguiente actividad
  /** True cuando la respuesta es parcial/cero y Sophia debe desglosar */
  needs_scaffolding?: boolean
  /** Sugerencia de sub-pregunta específica para descomponer (sin revelar la respuesta) */
  next_subquestion?: string
  /**
   * Qué hizo el alumno en este turno, según el verificador (reemplaza a los
   * regex que leían «paso» o «ayuda» en el texto):
   *  - answer: intentó responder
   *  - asks_for_help: pide una pista o dice que no entiende la pregunta
   *  - does_not_know: admite que no conoce el tema («no sé», «nunca lo vi»)
   */
  student_intent?: 'answer' | 'asks_for_help' | 'does_not_know'
  /**
   * true cuando el verificador no respondió (error de API, JSON inválido).
   * El alumno avanza igual, pero el intento se guarda SIN nivel: no puntúa
   * hasta que scripts/reverificar-pendientes.ts lo re-verifique.
   */
  unverified?: boolean
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
