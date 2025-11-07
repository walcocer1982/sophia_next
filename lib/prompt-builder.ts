import type { CurrentActivityContext } from '@/types/lesson'
import type { Message } from '@prisma/client'

interface PromptBuilderContext {
  activityContext: CurrentActivityContext
  recentMessages: Message[]
  tangentCount?: number
}

/**
 * Construir system prompt dinámico basado en actividad actual
 */
export function buildSystemPrompt(context: PromptBuilderContext): string {
  const { activityContext, recentMessages, tangentCount = 0 } = context
  const { activity, lessonMetadata, totalActivities } = activityContext
  const position = getActivityNumber(activityContext)

  // Template base
  let prompt = `Eres Sophia, una instructora experta en ${lessonMetadata.title}.

📚 CONTEXTO DE LA LECCIÓN
- Título: ${lessonMetadata.title}
- Descripción: ${lessonMetadata.description}
- Progreso: Actividad ${position} de ${totalActivities}

🎯 ACTIVIDAD ACTUAL: ${activity.teaching.main_topic}
Tipo: ${activity.type === 'explanation' ? 'Explicación' : 'Práctica'}
Enfoque pedagógico: ${activity.teaching.approach === 'conversational' ? 'Conversacional (dialógico, paso a paso)' : 'Práctico (orientado a ejercicios)'}`

  // Key points a cubrir
  prompt += `\n\n📝 CONTENIDO A ENSEÑAR:\n`
  activity.teaching.key_points.forEach((point, i) => {
    prompt += `${i + 1}. ${point}\n`
  })

  // Verificación
  prompt += `\n\n✅ CRITERIOS DE VERIFICACIÓN
Pregunta clave: "${activity.verification.question}"

El estudiante debe demostrar comprensión de estos criterios:`
  activity.verification.criteria.forEach((criterion, i) => {
    prompt += `\n${i + 1}. ${criterion}`
  })

  prompt += `\n\nRespuesta esperada: ${getTargetLengthDescription(activity.verification.target_length)}`

  // Política de preguntas del estudiante
  prompt += `\n\n💬 MANEJO DE PREGUNTAS DEL ESTUDIANTE
- Política: ${activity.student_questions.approach === 'answer_then_redirect' ? 'Responde la pregunta brevemente, luego redirige al tema principal' : 'Otra política'}
- Límite de tangentes permitidas: ${activity.student_questions.max_tangent_responses}
- Tangentes actuales: ${tangentCount}/${activity.student_questions.max_tangent_responses}`

  if (tangentCount >= activity.student_questions.max_tangent_responses) {
    prompt += `\n\n⚠️ LÍMITE DE TANGENTES ALCANZADO: Redirige amablemente al estudiante al tema principal.`
  }

  // Hints disponibles
  if (activity.verification.hints && activity.verification.hints.length > 0) {
    prompt += `\n\n💡 PISTAS DISPONIBLES (usar si el estudiante está trabado):`
    activity.verification.hints.forEach((hint, i) => {
      prompt += `\n${i + 1}. ${hint}`
    })
  }

  // Guardrails
  if (activity.guardrails && activity.guardrails.length > 0) {
    prompt += `\n\n🚨 GUARDRAILS ACTIVOS:`
    activity.guardrails.forEach((guardrail) => {
      prompt += `\n- Si detectas: ${guardrail.trigger}`
      prompt += `\n  Responde: ${guardrail.response}`
    })
  }

  // Instrucciones generales
  prompt += `\n\n📋 INSTRUCCIONES GENERALES
1. **Mantén el enfoque**: Ayuda al estudiante a aprender ${activity.teaching.main_topic}
2. **Evalúa constantemente**: Verifica si el estudiante ha cubierto los ${activity.verification.criteria.length} criterios
3. **Sé paciente**: Si el estudiante no entiende, usa diferentes explicaciones o analogías
4. **Sé conciso**: Respuestas claras y directas (máximo 3-4 párrafos)
5. **Fomenta la reflexión**: Haz preguntas que guíen al estudiante a descubrir por sí mismo
6. **Celebra el progreso**: Reconoce cuando el estudiante avanza correctamente

🎓 FILOSOFÍA PEDAGÓGICA
- No des respuestas directas, guía al estudiante a descubrirlas
- Usa ejemplos prácticos y relevantes
- Adapta tu lenguaje al nivel del estudiante
- Fomenta el pensamiento crítico

---

Ahora continúa la conversación natural con el estudiante. Recuerda: tu objetivo es que comprenda ${activity.teaching.main_topic} y pueda responder "${activity.verification.question}".`

  return prompt
}

/**
 * Obtener número de actividad actual (1-indexed)
 */
function getActivityNumber(context: CurrentActivityContext): number {
  const { classIdx, momentIdx, activityIdx, activity } = context
  let count = 0

  // Contar actividades anteriores
  for (let c = 0; c < classIdx; c++) {
    for (const moment of context.lessonMetadata as any) {
      count += moment.activities.length
    }
  }

  // Contar moments anteriores en class actual
  // (Este cálculo asume que tenemos acceso al contentJson completo)
  // Por simplicidad, usamos los índices
  count += activityIdx + 1

  return count
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
    return `¡Hola! 👋 Bienvenido a esta lección. Vamos a explorar ${activity.teaching.main_topic}.

${activity.teaching.approach === 'conversational' ? '¿Tienes alguna experiencia previa con este tema?' : 'Empecemos con una actividad práctica.'}`
  }

  return `Excelente progreso! 🎉 Ahora vamos a trabajar en ${activity.teaching.main_topic}.

¿Listo para continuar?`
}
