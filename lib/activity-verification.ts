import { anthropic } from '@/lib/anthropic'
import type { Activity, ActivityCompletionResult, UnderstandingLevel, ResponseType, VerificationHints } from '@/types/lesson'

/**
 * Construir sección de hints para el prompt de verificación
 */
function buildHintsSection(hints: VerificationHints): string {
  const parts: string[] = []

  if (hints.accept_examples) {
    parts.push('- ACEPTAR EJEMPLOS: Si el estudiante da ejemplos válidos, cuenta como comprensión')
  }

  if (hints.accept_paraphrase !== false) {
    parts.push('- ACEPTAR PARÁFRASIS: Acepta reformulaciones que demuestren comprensión')
  }

  if (hints.key_concepts?.length) {
    parts.push(`- CONCEPTOS CLAVE (flexibles): ${hints.key_concepts.join(', ')}`)
  }

  if (hints.common_mistakes?.length) {
    parts.push(`- ERRORES COMUNES A DETECTAR: ${hints.common_mistakes.join('; ')}`)
  }

  if (parts.length === 0) return ''

  return `\nGUÍAS DE EVALUACIÓN ADICIONALES:\n${parts.join('\n')}\n`
}

/**
 * Prompt de verificación para preguntas ABIERTAS
 * Evalúa calidad de razonamiento, no keywords específicos
 */
function buildOpenEndedVerificationPrompt(
  agentInstruction: string,
  activity: Activity,
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] | undefined,
  hintsSection: string,
  expectedLevel: UnderstandingLevel
): string {
  const criteria = activity.verification.success_criteria?.must_include || []

  return `Eres un evaluador pedagógico experto. Esta es una PREGUNTA ABIERTA — no hay una única respuesta correcta.

INSTRUCCIÓN DE LA ACTIVIDAD:
${agentInstruction}

PREGUNTA ABIERTA: ${activity.verification.question}

ASPECTOS A OBSERVAR (guías, NO criterios estrictos):
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
${hintsSection}
NIVEL DE COMPRENSIÓN ESPERADO: ${expectedLevel}

RESPUESTA DEL ESTUDIANTE:
"${userMessage}"

${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO DE LA CONVERSACIÓN PREVIA:\n${conversationHistory.slice(-5).map((m) => `${m.role === 'user' ? 'Estudiante' : 'Instructor'}: ${m.content}`).join('\n\n')}` : ''}

TAREA:
Evalúa la CALIDAD DEL RAZONAMIENTO del estudiante, no si menciona palabras clave.

REGLA CRÍTICA — CONTEXTO DE CONVERSACIÓN:
Antes de evaluar, revisa la CONVERSACIÓN PREVIA. Si el instructor hizo una pregunta de seguimiento diferente a la original, evalúa si el estudiante respondió correctamente a ESA pregunta. No marques como "off_topic" si el estudiante responde a lo que le preguntaron.

CRITERIOS PARA PREGUNTA ABIERTA:
- ¿Demuestra reflexión genuina sobre el tema?
- ¿Articula una posición o perspectiva propia?
- ¿Conecta conceptos aprendidos con su razonamiento?
- ¿La respuesta tiene profundidad mínima (no es monosílaba ni evasiva)?

REGLA PRINCIPAL: Si el estudiante muestra pensamiento crítico y engagement con el tema, es SUFICIENTE para avanzar. No busques una respuesta "perfecta".

NIVELES DE COMPRENSIÓN:
- "memorized": Repite información sin reflexión
- "understood": Muestra comprensión propia del tema
- "applied": Conecta con experiencias o ejemplos propios
- "analyzed": Evalúa, compara o propone soluciones originales

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [aspectos que el estudiante abordó],
  "criteriaMissing": [aspectos que no abordó - NO penalizar fuertemente],
  "completeness_percentage": number (0-100),
  "understanding_level": "memorized" | "understood" | "applied" | "analyzed",
  "response_type": "correct" | "partial" | "incorrect" | "off_topic",
  "feedback": "feedback conciso y constructivo (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low",
  "ready_to_advance": boolean
}

REGLAS PARA ready_to_advance (PREGUNTA ABIERTA — más permisivo):
- true si el estudiante demuestra reflexión genuina (completeness >= 40%)
- true si articula una posición coherente, aunque no cubra todos los aspectos
- false SOLO si la respuesta es evasiva, monosílaba o completamente off-topic

Responde SOLO con el JSON, sin texto adicional.`
}

/**
 * Prompt de verificación ESTÁNDAR (criterios específicos)
 */
function buildStandardVerificationPrompt(
  agentInstruction: string,
  activity: Activity,
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] | undefined,
  successCriteria: { must_include: string[]; min_completeness?: number; understanding_level?: UnderstandingLevel; hints?: VerificationHints },
  hintsSection: string,
  minCompleteness: number,
  expectedLevel: UnderstandingLevel
): string {
  return `Eres un evaluador pedagógico experto. Tu tarea es evaluar si un estudiante ha comprendido correctamente un tema.

INSTRUCCIÓN DE LA ACTIVIDAD:
${agentInstruction}

PREGUNTA DE VERIFICACIÓN: ${activity.verification.question}

CRITERIOS DE ÉXITO (must_include):
${successCriteria.must_include.map((c, i) => `${i + 1}. ${c}`).join('\n')}
${hintsSection}
UMBRAL MÍNIMO DE COMPLETITUD: ${minCompleteness}%
NIVEL DE COMPRENSIÓN ESPERADO: ${expectedLevel}

RESPUESTA DEL ESTUDIANTE:
"${userMessage}"

${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO DE LA CONVERSACIÓN PREVIA:\n${conversationHistory.slice(-5).map((m) => `${m.role === 'user' ? 'Estudiante' : 'Instructor'}: ${m.content}`).join('\n\n')}` : ''}

TAREA:
Evalúa la respuesta del estudiante contra los criterios de éxito.

REGLA CRÍTICA — CONTEXTO DE CONVERSACIÓN:
Antes de evaluar, revisa la CONVERSACIÓN PREVIA. Si el instructor (IA) hizo una PREGUNTA DE SEGUIMIENTO o PROFUNDIZACIÓN diferente a la pregunta de verificación original, y el estudiante está respondiendo a ESA pregunta de seguimiento:
- NO marques como "off_topic" — el estudiante está respondiendo lo que le preguntaron
- Evalúa si la respuesta del estudiante demuestra comprensión del tema general de la actividad
- Si el estudiante ya cumplió criterios en mensajes ANTERIORES de la conversación, considéralos como cumplidos
- Si la pregunta de seguimiento va MÁS ALLÁ de los criterios originales (profundización), y el estudiante responde correctamente, marca ready_to_advance como true

REGLAS DE EVALUACIÓN FLEXIBLE:
- Evalúa COMPRENSIÓN DEL CONCEPTO, NO palabras exactas
- Acepta sinónimos, paráfrasis y diferentes formas de expresar el mismo concepto
- Si el estudiante demuestra que ENTENDIÓ LA IDEA CENTRAL, marca el criterio como cumplido
- Solo marca como NO cumplido si claramente NO ENTENDIÓ o tiene información ERRÓNEA

NIVELES DE COMPRENSIÓN:
- "memorized": Repite información sin procesar
- "understood": Explica con sus propias palabras
- "applied": Puede usar el concepto en ejemplos
- "analyzed": Puede comparar, contrastar o evaluar

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [lista de criterios cumplidos],
  "criteriaMissing": [lista de criterios NO cumplidos],
  "completeness_percentage": number (0-100),
  "understanding_level": "memorized" | "understood" | "applied" | "analyzed",
  "response_type": "correct" | "partial" | "incorrect" | "off_topic",
  "feedback": "feedback conciso y constructivo (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low",
  "ready_to_advance": boolean
}

REGLAS PARA response_type:
- "correct": Cumple todos los criterios clave (completeness >= 80%)
- "partial": Cumple algunos criterios pero falta profundidad (40-79%)
- "incorrect": Tiene errores conceptuales o información equivocada
- "off_topic": La respuesta no está relacionada con la pregunta

REGLAS PARA ready_to_advance:
- true si completeness_percentage >= ${minCompleteness}
- true si understanding_level es igual o superior a "${expectedLevel}"
- false si el estudiante claramente no entendió el concepto central

Responde SOLO con el JSON, sin texto adicional.`
}

/**
 * Extraer respuestas acumuladas del estudiante de la conversación reciente.
 * Combina los últimos N mensajes del estudiante para evaluar criterios
 * que fueron respondidos en mensajes separados.
 */
function buildAccumulatedStudentResponse(
  userMessage: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): string {
  if (!conversationHistory || conversationHistory.length < 3) {
    return userMessage
  }

  // Extraer los últimos 5 mensajes del estudiante (excluyendo continuaciones cortas)
  const recentStudentMessages = conversationHistory
    .filter(m => m.role === 'user')
    .slice(-5)
    .map(m => m.content.trim())
    .filter(m => m.length > 15) // Ignorar "sí", "ok", "listo", etc.

  // Agregar el mensaje actual si no es una continuación
  if (userMessage.trim().length > 15) {
    recentStudentMessages.push(userMessage)
  }

  if (recentStudentMessages.length <= 1) {
    return userMessage
  }

  // Combinar en un resumen acumulativo
  return `[Respuestas acumuladas del estudiante en esta actividad]:\n${recentStudentMessages.map((m, i) => `- Respuesta ${i + 1}: "${m}"`).join('\n')}\n\n[Último mensaje]: "${userMessage}"`
}

/**
 * Verificar si el estudiante completó la actividad usando IA
 * Usa la nueva estructura success_criteria con min_completeness y understanding_level
 */
export async function verifyActivityCompletion(
  userMessage: string,
  activity: Activity,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<ActivityCompletionResult> {
  // Backwards compatibility: support both old and new structure
  // Old: verification.criteria[], New: verification.success_criteria.must_include[]
  // AJUSTE: Reducido min_completeness por defecto de 60% a 50% para ser más permisivo
  const successCriteria = activity.verification.success_criteria || {
    must_include: (activity.verification as { criteria?: string[] }).criteria || [],
    min_completeness: 50,
    understanding_level: 'understood' as const
  }
  const minCompleteness = successCriteria.min_completeness ?? 50
  const expectedLevel = successCriteria.understanding_level ?? 'understood'
  const hints = successCriteria.hints || {}

  // Old: activity.agent_instruction, New: activity.teaching.agent_instruction
  const agentInstruction = activity.teaching?.agent_instruction || (activity as { agent_instruction?: string }).agent_instruction || ''

  // Construir sección de hints si existen
  const hintsSection = buildHintsSection(hints)

  // Determinar si es pregunta abierta
  const isOpenEnded = activity.verification.open_ended === true
  // Umbral efectivo: open-ended es más permisivo (40%) que estándar
  const effectiveThreshold = isOpenEnded ? 40 : minCompleteness

  // Construir respuesta acumulada del estudiante para evaluar criterios repartidos en varios mensajes
  const accumulatedResponse = buildAccumulatedStudentResponse(userMessage, conversationHistory)

  // Construir contexto para verificación
  const verificationPrompt = isOpenEnded
    ? buildOpenEndedVerificationPrompt(agentInstruction, activity, accumulatedResponse, conversationHistory, hintsSection, expectedLevel)
    : buildStandardVerificationPrompt(agentInstruction, activity, accumulatedResponse, conversationHistory, successCriteria, hintsSection, minCompleteness, expectedLevel)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Usar Haiku para verificación (más rápido y económico)
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: verificationPrompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from verification')
    }

    // Extraer JSON de markdown code blocks si está presente
    let jsonText = content.text.trim()

    // Si el texto tiene markdown code blocks (```json ... ```), extraerlos
    const jsonBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1].trim()
    }

    // Parsear JSON response
    const result: ActivityCompletionResult = JSON.parse(jsonText)

    // Validar que ready_to_advance sea consistente
    if (result.completeness_percentage >= effectiveThreshold && !result.ready_to_advance) {
      result.ready_to_advance = true
    }

    if (isOpenEnded) {
      // LÓGICA OPEN-ENDED: Si el estudiante muestra reflexión genuina, permitir avanzar
      if (result.completeness_percentage >= 40 && result.response_type !== 'off_topic') {
        result.ready_to_advance = true
      }
    } else {
      // LÓGICA "CASI CORRECTO": Si está en el rango 50-65% con response_type partial,
      // permitir avanzar pero ajustar feedback para reconocer el progreso
      const isAlmostCorrect = result.completeness_percentage >= 50 &&
                             result.completeness_percentage < 65 &&
                             result.response_type === 'partial'

      if (isAlmostCorrect && !result.ready_to_advance) {
        if (result.completeness_percentage >= effectiveThreshold) {
          result.ready_to_advance = true
          if (!result.feedback.includes('esencial')) {
            result.feedback = 'Has captado lo esencial del concepto. ' + result.feedback
          }
        }
      }
    }

    // Si la confianza es baja pero el porcentaje es alto, confiar más en el porcentaje
    if (result.confidence === 'low' && result.completeness_percentage >= 70) {
      result.ready_to_advance = true
    }

    return result
  } catch (error) {
    console.error('❌ Error verifying activity completion:', error)

    // Fallback: verificación simple por keywords (o por longitud si open-ended)
    return fallbackVerification(userMessage, activity, isOpenEnded ? effectiveThreshold : minCompleteness, isOpenEnded)
  }
}

/**
 * Verificación fallback simple si la IA falla
 */
function fallbackVerification(
  userMessage: string,
  activity: Activity,
  minCompleteness: number,
  isOpenEnded: boolean = false
): ActivityCompletionResult {
  // Para preguntas abiertas en fallback: evaluar longitud y engagement mínimo
  if (isOpenEnded) {
    const wordCount = userMessage.trim().split(/\s+/).length
    const hasSubstance = wordCount >= 10 // Al menos 10 palabras
    const completeness_percentage = hasSubstance ? 60 : 20

    return {
      completed: hasSubstance,
      criteriaMatched: hasSubstance ? ['Respuesta con reflexión'] : [],
      criteriaMissing: hasSubstance ? [] : ['Respuesta necesita más desarrollo'],
      completeness_percentage,
      understanding_level: hasSubstance ? 'understood' : 'memorized',
      response_type: hasSubstance ? 'correct' : 'partial',
      feedback: hasSubstance
        ? 'Buena reflexión sobre el tema.'
        : 'Intenta desarrollar un poco más tu respuesta.',
      confidence: 'low',
      ready_to_advance: hasSubstance,
    }
  }

  const messageLower = userMessage.toLowerCase()
  const criteriaMatched: string[] = []
  const criteriaMissing: string[] = []
  // Backwards compatibility: support both old and new structure
  const criteria = activity.verification.success_criteria?.must_include ||
    (activity.verification as { criteria?: string[] }).criteria || []

  // Verificación simple: buscar keywords de cada criterio
  criteria.forEach((criterion) => {
    const criterionKeywords = criterion
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 4) // Solo palabras >4 chars

    const hasKeywords = criterionKeywords.some((keyword) =>
      messageLower.includes(keyword)
    )

    if (hasKeywords) {
      criteriaMatched.push(criterion)
    } else {
      criteriaMissing.push(criterion)
    }
  })

  const totalCriteria = criteria.length
  const completeness_percentage = totalCriteria > 0
    ? Math.round((criteriaMatched.length / totalCriteria) * 100)
    : 0

  const completed = criteriaMissing.length === 0
  const ready_to_advance = completeness_percentage >= minCompleteness

  // Determinar response_type basado en porcentaje
  let response_type: ResponseType = 'partial'
  if (completeness_percentage >= 80) {
    response_type = 'correct'
  } else if (completeness_percentage < 20) {
    response_type = 'off_topic'
  } else if (completeness_percentage < 40) {
    response_type = 'incorrect'
  }

  return {
    completed,
    criteriaMatched,
    criteriaMissing,
    completeness_percentage,
    understanding_level: 'understood' as UnderstandingLevel, // Default en fallback
    response_type,
    feedback: completed
      ? '¡Excelente! Has comprendido los conceptos clave.'
      : 'Bien, pero falta profundizar en algunos puntos.',
    confidence: 'low', // Baja confianza en fallback
    ready_to_advance,
  }
}

/**
 * Determinar si debe mostrarse un hint basado en intentos fallidos
 * NOTA: En el nuevo schema no hay hints predefinidos, se guía con el método socrático
 */
export function shouldShowHint(
  failedAttempts: number
): { show: boolean; hintLevel: 'subtle' | 'direct' | 'explicit' } {
  // Sin hints predefinidos, el nivel de ayuda aumenta con los intentos
  if (failedAttempts < 2) {
    return { show: false, hintLevel: 'subtle' }
  }

  if (failedAttempts < 4) {
    return { show: true, hintLevel: 'subtle' }
  }

  if (failedAttempts < 6) {
    return { show: true, hintLevel: 'direct' }
  }

  return { show: true, hintLevel: 'explicit' }
}
