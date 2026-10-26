import { callAndParseJson, HAIKU_MODEL } from '@/lib/anthropic'
import type { Activity, IntentClassification } from '@/types/lesson'

export interface ConversationContext {
  currentLesson: string
  currentActivity: string
  lastInstructorQuestion?: string
}

/**
 * Patrones para clasificación rápida (sin API)
 */
const CONTINUATION_PATTERNS = [
  /^(si|sí|ok|vale|entendido|claro|continuar|siguiente|adelante|de acuerdo|perfecto|listo)$/i,
  /^(si|sí|ok|vale)\s+(por\s+favor|porfavor)$/i,
]

const CLARIFICATION_PATTERNS = [
  /^(no\s+entiendo|no\s+entendí|no\s+comprendo)/i,
  /^(repite|repíteme|otra\s+vez)/i,
  /^(podrías\s+aclarar|aclárame|aclara)/i,
]

/**
 * Clasificación rápida basada en patrones (no requiere API)
 */
function quickClassify(message: string): IntentClassification | null {
  const normalized = message.toLowerCase().trim()

  // Respuestas de continuación (muy comunes)
  if (CONTINUATION_PATTERNS.some(p => p.test(normalized))) {
    return {
      intent: 'answer_verification',
      question_type: null,
      is_on_topic: true,
      relevance_score: 100,
      topic_mentioned: null,
      needs_redirect: false,
      suggested_response_strategy: 'acknowledge_answer',
    }
  }

  // Solicitudes de aclaración claras
  if (CLARIFICATION_PATTERNS.some(p => p.test(normalized))) {
    return {
      intent: 'request_clarification',
      question_type: 'clarification',
      is_on_topic: true,
      relevance_score: 95,
      topic_mentioned: null,
      needs_redirect: false,
      suggested_response_strategy: 'full_answer',
    }
  }

  // Una pregunta NO se da por pertinente solo por terminar en «?» (23 oct 2026,
  // clase de EOM): «¿Eres mejor que Gemini?» y «¿Quién ganó la Champions?» pasaban
  // como preguntas del tema sin consultar al modelo. Las decide el modelo.

  // No se puede clasificar rápidamente
  return null
}

/**
 * Clasifica la intención del mensaje del estudiante
 */
export async function classifyIntent(
  message: string,
  activity: Activity,
  context: ConversationContext
): Promise<IntentClassification> {
  // OPTIMIZACIÓN: Intentar clasificación rápida primero
  const quickResult = quickClassify(message)
  if (quickResult) {
    return quickResult
  }

  const classificationPrompt = `
Clasifica la intención de este mensaje del estudiante.

CONTEXTO:
- Lección actual: ${context.currentLesson}
- Actividad: ${context.currentActivity}
- Última pregunta del instructor: ${context.lastInstructorQuestion || 'N/A'}

MENSAJE DEL ESTUDIANTE:
"${message}"

REGLAS CRÍTICAS:

1. RESPUESTA A VERIFICACIÓN:
   - Si el instructor hizo una pregunta y el estudiante responde con contenido técnico/educativo
   → intent = "answer_verification" (incluso si es parcial o con errores)

2. ON-TOPIC (SÉ GENEROSO):
   - Relacionado al tema = is_on_topic: true, relevance_score >= 70
   - Solo marca off-topic si es completamente ajeno al curso

3. CUANDO LA PREGUNTA DEL INSTRUCTOR PIDE SUS PROPIAS PREGUNTAS O DUDAS ("¿qué te preguntas…?"):
   - Una pregunta del estudiante sobre el tema de la lección ES su respuesta → answer_verification, on-topic
   - Una pregunta sobre otra cosa (otro tema, otra IA, deportes, su vida) sigue siendo off-topic

4. EJEMPLOS:
   - "A, c, a, c, a, c La 1 la 3..." (intentando clasificar) → answer_verification, on-topic, relevance 75+
   - "que hice mal" (pregunta sobre su respuesta) → ask_question, on-topic, relevance 90+
   - "¿qué significa esa palabra de la pregunta?" → request_clarification, on-topic
   - "cuéntame un chiste" → small_talk, off-topic, relevance 0
   - "hola" o "¿me entiendes?" sin responder nada → small_talk, off-topic
   - "¿eres mejor que otra IA?", "¿quién ganó el partido?", "ayúdame a hacer mi horario" → off_topic, relevance 0-20

Responde SOLO con JSON válido (sin markdown):
{
  "intent": "answer_verification" | "ask_question" | "request_clarification" | "off_topic" | "small_talk",
  "question_type": "clarification" | "example_request" | "application" | "why_question" | null,
  "is_on_topic": true o false,
  "relevance_score": número entre 0-100,
  "topic_mentioned": "string o null",
  "needs_redirect": true o false,
  "suggested_response_strategy": "full_answer" | "brief_redirect" | "firm_redirect" | "acknowledge_answer"
}`

  try {
    return await callAndParseJson<IntentClassification>(classificationPrompt, {
      model: HAIKU_MODEL,
      maxTokens: 400,
    })
  } catch (error) {
    console.error('Error en clasificación de intención:', error)
    // Valor por defecto en caso de error
    return {
      intent: 'answer_verification',
      question_type: null,
      is_on_topic: true,
      relevance_score: 50,
      topic_mentioned: null,
      needs_redirect: false,
      suggested_response_strategy: 'acknowledge_answer',
    }
  }
}
