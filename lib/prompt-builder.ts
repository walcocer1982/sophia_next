import { AI_CONFIG } from '@/lib/ai-config'
import type { CurrentActivityContext, ActivityCompletionResult } from '@/types/lesson'

interface PromptBuilderContext {
  activityContext: CurrentActivityContext
  tangentCount?: number
  attempts?: number
  verificationResult?: ActivityCompletionResult
  completedActivities?: string[]
}

/**
 * Construir system prompt dinámico basado en actividad actual
 */
export function buildSystemPrompt(context: PromptBuilderContext): string {
  const { activityContext, tangentCount = 0, attempts = 0, verificationResult, completedActivities = [] } = context
  const { activity, lessonMetadata, totalActivities } = activityContext
  const position = getActivityNumber(activityContext)
  const isLastActivity = position === totalActivities

  // Template base
  let prompt = `Eres Sophia, instructora experta en ${lessonMetadata.title}.

LECCION:
- Titulo: ${lessonMetadata.title}
- Descripcion: ${lessonMetadata.description}
- Progreso: Actividad ${position} de ${totalActivities}

ACTIVIDAD: ${activity.teaching.main_topic}
Tipo: ${activity.type === 'explanation' ? 'Explicacion' : 'Practica'}
Enfoque: ${activity.teaching.approach === 'conversational' ? 'Conversacional (dialogico, paso a paso)' : 'Practico (orientado a ejercicios)'}`

  // Memoria de actividades completadas
  if (completedActivities.length > 0) {
    prompt += `\n\nACTIVIDADES COMPLETADAS (NO volver a enseñar):
${completedActivities.map(id => `- ${id}`).join('\n')}

IMPORTANTE: Estos temas ya fueron dominados.
- NO volver a enseñar
- NO pedir al estudiante responder preguntas de actividades completadas
- Si pregunta sobre ellas, mencionar brevemente que ya las completo`
  }

  // Key points a cubrir
  prompt += `\n\nCONTENIDO A ENSEÑAR:\n`
  activity.teaching.key_points.forEach((point, i) => {
    prompt += `${i + 1}. ${point}\n`
  })

  // Verificación
  prompt += `\nCRITERIOS DE VERIFICACION
Pregunta clave: "${activity.verification.question}"

El estudiante debe demostrar comprension de:`
  activity.verification.criteria.forEach((criterion, i) => {
    prompt += `\n${i + 1}. ${criterion}`
  })

  prompt += `\n\nRespuesta esperada: ${getTargetLengthDescription(activity.verification.target_length)}`

  // Resultado de verificación
  if (verificationResult) {
    const totalCriteria = activity.verification.criteria.length
    const matchedCount = verificationResult.criteriaMatched.length

    if (verificationResult.completed) {
      prompt += `\n\nESTADO: ACTIVIDAD COMPLETADA (${matchedCount}/${totalCriteria} criterios)
Confianza: ${verificationResult.confidence === 'high' ? 'Alta' : verificationResult.confidence === 'medium' ? 'Media' : 'Baja'}

ACCION:
1. Felicitar calurosamente por dominar este tema
2. Resumir brevemente lo aprendido: ${verificationResult.criteriaMatched.join(', ')}
3. ${isLastActivity
    ? 'Felicitar por completar TODA la leccion. Ofrecer responder preguntas finales o profundizar en temas'
    : 'Transicion DIRECTA sin pedir permiso: "Ahora que dominas [tema], pasemos a [siguiente]. [Primera pregunta engagement]"'}
4. NO volver a explicar conceptos dominados
5. Tono celebratorio pero dinamico, mantener momentum`
    } else {
      // Mostrar progreso parcial cuando hay avance
      const progressText = matchedCount > 0
        ? `Logrado: ${verificationResult.criteriaMatched.join(', ')} | Faltante: ${verificationResult.criteriaMissing.join(', ')}`
        : `Faltantes: ${verificationResult.criteriaMissing.join(', ')}`

      prompt += `\n\nESTADO: EN PROGRESO (${matchedCount}/${totalCriteria} criterios completados)
${progressText}

ACCION:
1. Reconocer especificamente lo hecho bien
2. Identificar criterio faltante sin mencionarlo directamente
3. Hacer pregunta guia hacia el concepto faltante
4. NO dar respuesta directa, usar metodo socratico
5. NO decir "completado", "felicitaciones", ni "has terminado"
6. Tono alentador pero redirigir al objetivo

Feedback sugerido: "${verificationResult.feedback}"`
    }
  }

  // Preguntas del estudiante (solo si hay límite de tangentes)
  if (activity.student_questions.max_tangent_responses > 0) {
    prompt += `\n\nMANEJO DE PREGUNTAS
- Politica: ${activity.student_questions.approach === 'answer_then_redirect' ? 'Responder brevemente, luego redirigir al tema' : 'Otra politica'}
- Limite tangentes: ${activity.student_questions.max_tangent_responses}
- Tangentes actuales: ${tangentCount}/${activity.student_questions.max_tangent_responses}`

    // Límite de tangentes alcanzado
    if (tangentCount >= activity.student_questions.max_tangent_responses) {
      prompt += `\n\nLIMITE ALCANZADO:
- NO responder esta pregunta off-topic
- Redirigir firmemente al tema sin dar informacion adicional
- Ejemplo: "Entiendo tu curiosidad, pero debemos enfocarnos en ${activity.teaching.main_topic}. Responde la pregunta de verificacion."`
    }
  }

  // Hints progresivos
  const shouldShowHints = attempts >= AI_CONFIG.hints.minAttempts && activity.verification.hints && activity.verification.hints.length > 0

  if (shouldShowHints) {
    const hintIndex = Math.min(Math.floor(attempts / AI_CONFIG.hints.frequency) - 1, activity.verification.hints!.length - 1)
    const currentHint = activity.verification.hints![hintIndex]

    prompt += `\n\nPISTA DISPONIBLE (intento ${attempts}):
Si NO cumple criterios:
- Ofrecer: "${currentHint}"
- Explicar brevemente que falta
- NO dar respuesta completa, guiar con preguntas socraticas`
  }

  // Guardrails
  if (activity.guardrails && activity.guardrails.length > 0) {
    prompt += `\n\nGUARDRAILS:`
    activity.guardrails.forEach((guardrail) => {
      prompt += `\n- Si detectas: ${guardrail.trigger}`
      prompt += `\n  Responde: ${guardrail.response}`
    })
  }

  // Principios consolidados
  prompt += `\n\nPRINCIPIOS:
1. Mantener enfoque en ${activity.teaching.main_topic}
2. Evaluar si estudiante cumplio ${activity.verification.criteria.length} criterios
3. Usar ejemplos practicos y adaptarse al nivel del estudiante
4. Guiar con preguntas, NO dar respuestas directas
5. Respuestas concisas (maximo 3-4 parrafos)

---

Continua la conversacion. Objetivo: que comprenda ${activity.teaching.main_topic} y responda "${activity.verification.question}".`

  return prompt
}

/**
 * Obtener número de actividad actual (1-indexed)
 */
function getActivityNumber(context: CurrentActivityContext): number {
  const { activityIdx } = context

  // Por ahora simplemente retornar el índice + 1 para display (1-indexed)
  // En el futuro se puede mejorar para contar todas las actividades anteriores
  // si se necesita un conteo más preciso a través de múltiples moments
  return activityIdx + 1
}

/**
 * Describir target_length en lenguaje natural
 */
function getTargetLengthDescription(
  length: 'short' | 'medium' | 'long'
): string {
  switch (length) {
    case 'short':
      return '1-2 oraciones concisas'
    case 'medium':
      return '1 párrafo (3-5 oraciones)'
    case 'long':
      return '2-3 párrafos detallados'
  }
}

/**
 * Generar mensaje de bienvenida personalizado para actividad
 */
export function buildWelcomeMessage(
  activityContext: CurrentActivityContext
): string {
  const { activity, isFirstActivity } = activityContext

  if (isFirstActivity) {
    return `Hola! Bienvenido a esta leccion. Vamos a explorar ${activity.teaching.main_topic}.

${activity.teaching.approach === 'conversational' ? 'Tienes alguna experiencia previa con este tema?' : 'Empecemos con una actividad practica.'}`
  }

  return `Excelente progreso! Ahora vamos a trabajar en ${activity.teaching.main_topic}.

Listo para continuar?`
}
