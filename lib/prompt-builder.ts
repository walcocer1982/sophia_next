import type { CurrentActivityContext, ActivityCompletionResult, ActivityType, ActivityComplexity, IntentClassification, LessonContext, Activity } from '@/types/lesson'
import type { Message } from '@prisma/client'
import { buildOptimizedContext } from './message-summarizer'

interface PromptBuilderContext {
  activityContext: CurrentActivityContext
  recentMessages: Message[]
  tangentCount?: number
  attempts?: number
  verificationResult?: ActivityCompletionResult
  completedActivities?: string[]
  intentClassification?: IntentClassification
  lessonContext?: LessonContext  // Contexto normativo/técnico de la lección
  nextActivity?: Activity  // Siguiente actividad (cuando ready_to_advance = true)
  lastUserMessage?: string  // Último mensaje del estudiante (para detectar "no sé")
}

/**
 * Detecta si el estudiante expresó que no sabe la respuesta
 * Expandido para detectar más variantes de confusión/duda
 */
function isStudentUnsure(message: string): boolean {
  const trimmed = message.trim()

  // Patrones explícitos de "no sé"
  const unsurePatterns = [
    /no\s*(lo\s*)?s[eé]/i,
    /no\s*tengo\s*(ni\s*)?idea/i,
    /no\s*entiendo/i,
    /no\s*recuerdo/i,
    /no\s*me\s*acuerdo/i,
    /no\s*puedo/i,
    /no\s*s[eé]\s*qu[eé]\s*(hacer|decir|responder)/i,
    /no\s*me\s*sale/i,
    /me\s*rindo/i,
    /me\s*confund[íi]/i,
    /estoy\s*(muy\s*)?(confundid[oa]|perdid[oa])/i,
    /ayuda/i,
    /pista/i,
    /dame\s*(una\s*)?(pista|ayuda)/i,
    /^\s*[\?¿]+\s*$/,                    // Solo signos de interrogación
    /^(mmm|ehh|umm|hmm)\s*\??$/i,        // Sonidos de duda
    /ni\s*idea/i,
    /pas[oó]/i,                          // "paso" como rendirse
  ]

  if (unsurePatterns.some(pattern => pattern.test(trimmed))) {
    return true
  }

  // Respuestas muy cortas (<15 chars) que no son confirmaciones
  const confirmationPatterns = [
    /^(si|sí|ok|vale|entendido|claro|listo|perfecto|de\s*acuerdo)$/i,
  ]
  if (trimmed.length < 15 && trimmed.length > 0) {
    const isConfirmation = confirmationPatterns.some(p => p.test(trimmed))
    if (!isConfirmation && !/[a-záéíóúñ]{4,}/i.test(trimmed)) {
      // Muy corto y sin palabras significativas = probable confusión
      return true
    }
  }

  return false
}

/**
 * Tipo de retorno con bloques para Prompt Caching
 */
interface SystemPromptWithCache {
  staticBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
  dynamicPrompt: string
}

/**
 * Techo de tokens por complejidad (safety ceiling, NOT length control).
 * La longitud real se controla via instrucciones en el prompt.
 * El modelo para naturalmente (stop_reason: "end_turn").
 * Solo pagas por tokens generados, no por el techo.
 */
export const COMPLEXITY_TOKENS: Record<ActivityComplexity, number> = {
  simple: 1024,
  moderate: 1536,
  complex: 2048,
}

/**
 * Obtener maxTokens basado en complejidad de la actividad
 */
export function getMaxTokensForActivity(complexity?: ActivityComplexity): number {
  return complexity ? COMPLEXITY_TOKENS[complexity] : COMPLEXITY_TOKENS.moderate
}

/**
 * Templates de instrucciones según tipo de actividad (BREVES)
 */
const ACTIVITY_TYPE_TEMPLATES: Record<ActivityType, string> = {
  explanation: `MODO: EXPLICACIÓN
- Haz primero una pregunta exploratoria breve para saber qué ya sabe el estudiante
- Según su respuesta, explica SOLO lo que no sabe (no repitas lo que ya demostró conocer)
- Máximo 2-3 oraciones de contexto antes de tu primera pregunta
- Termina con UNA pregunta de comprensión`,

  practice: `MODO: PRÁCTICA
- Presenta el escenario o ejercicio concreto
- Haz preguntas CERRADAS y específicas: "¿Qué tipo de X es este?" "¿Qué harías primero?"
- Abre progresivamente: si responde bien, pregunta "¿por qué?" o "¿qué pasaría si...?"
- Da feedback específico sobre cada intento`,

  reflection: `MODO: REFLEXIÓN
- Haz UNA pregunta ABIERTA que invite a razonar
- No hay respuesta única correcta — evalúa calidad del razonamiento
- Profundiza con "¿por qué piensas eso?" o "¿puedes dar un ejemplo?"`,

  closing: `MODO: CIERRE
- Resume en 2-3 puntos clave
- Pregunta ABIERTA de síntesis: "¿Qué fue lo más importante?" o "¿Cómo lo aplicarías?"
- Felicita brevemente`
}

/**
 * Construir bloque de contexto técnico/normativo desde LessonContext
 * Este contexto se hereda a todas las actividades de la lección
 *
 * Estructura simplificada: pais, normativa, referencias, jerarquia_controles
 */
function buildTechnicalContextBlock(ctx: LessonContext): string {
  const parts: string[] = []

  // Marco normativo (país + normativa)
  if (ctx.pais || ctx.normativa) {
    const normParts = []
    if (ctx.pais) normParts.push(`País: ${ctx.pais}`)
    if (ctx.normativa) normParts.push(ctx.normativa)
    parts.push(`MARCO NORMATIVO: ${normParts.join(' | ')}`)
  }

  // Referencias
  if (ctx.referencias?.length) {
    parts.push(`REFERENCIAS: ${ctx.referencias.join(', ')}`)
  }

  // Jerarquía de controles
  if (ctx.jerarquia_controles) {
    parts.push(`JERARQUÍA DE CONTROLES: ${ctx.jerarquia_controles}`)
  }

  if (parts.length === 0) return ''

  return `

---
INFORMACIÓN TÉCNICA DE REFERENCIA:
${parts.join('\n')}`
}

/**
 * Construir system prompt dinámico con soporte para Prompt Caching
 * Retorna bloques separados: estáticos (cacheables) y dinámico (variable)
 */
export function buildSystemPrompt(context: PromptBuilderContext): SystemPromptWithCache {
  const {
    activityContext,
    tangentCount = 0,
    attempts = 0,
    verificationResult,
    completedActivities = [],
    intentClassification,
    lessonContext,
    nextActivity,
    lastUserMessage = '',
  } = context

  // Detectar si el estudiante expresó que no sabe
  const studentIsUnsure = isStudentUnsure(lastUserMessage)

  const {
    activity,
    totalActivities,
    isFirstActivity,
    isLastActivity,
    lessonTitle,
    lessonObjective,
    lessonKeyPoints,
    courseInstructor,
  } = activityContext

  const position = getActivityPosition(activityContext)
  const activityType: ActivityType = activity.type || 'explanation'
  const typeTemplate = ACTIVITY_TYPE_TEMPLATES[activityType]
  const maxAttempts = activity.verification.max_attempts || 3

  // ═══════════════════════════════════════════════════════════════
  // BLOQUE ESTÁTICO 1: Identidad y objetivo (CACHEABLE)
  // ═══════════════════════════════════════════════════════════════

  // Construir bloque de contexto técnico/normativo si existe
  const technicalContextBlock = lessonContext ? buildTechnicalContextBlock(lessonContext) : ''

  const staticBlock1 = `IDENTIDAD: Eres Sophia, instructora educativa (MUJER). SIEMPRE preséntate como "Sophia, tu instructora" usando género FEMENINO. NUNCA digas "soy tu instructor" en masculino. Refiérete a ti misma como instructora, mentora, lista, atenta — siempre en femenino.

${courseInstructor}

LECCIÓN: ${lessonTitle}
${lessonObjective ? `OBJETIVO: ${lessonObjective}` : ''}
${technicalContextBlock}

${lessonKeyPoints.length > 0 ? `PUNTOS CLAVE:
${lessonKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

---

REGLAS IMPORTANTES:

1. ✅ SÉ CONVERSACIONAL: Una pregunta a la vez
2. ✅ VALIDA CADA RESPUESTA: Reconoce lo que dijo antes de repreguntar
3. ✅ REPREGUNTAS NATURALES: No repitas exactamente la misma pregunta
4. ✅ FEEDBACK ESPECÍFICO: "Correcto en X, pero falta Y"
5. ✅ PISTAS PROGRESIVAS: Sutiles primero, luego más directas
6. ❌ NO REVELES LA RESPUESTA: Guía sin dar respuesta completa
7. ❌ NO AVANCES SIN VERIFICAR: Confirma comprensión primero

---

CALIBRACIÓN DE VALIDACIÓN:
- "Correcto", "Exacto", "Perfecto" → SOLO cuando la respuesta es completamente correcta
- "Bien pensado, pero..." o "Vas por buen camino..." → Para respuestas parciales
- "No exactamente..." o "Piénsalo de nuevo..." → Para respuestas incorrectas
- NUNCA digas "Perfecto" o "Exacto" si la respuesta tiene un error conceptual

RECONOCIMIENTO DE CONOCIMIENTO EXCEPCIONAL:
- Si el estudiante menciona un concepto avanzado que va más allá de la actividad (terminología especializada, fenómenos no cubiertos), reconócelo brevemente: "Buen punto sobre [concepto], eso muestra experiencia práctica"
- No profundizar, solo validar y continuar

DETECCIÓN DE ERRORES DE TIPEO NUMÉRICOS:
- Si el estudiante da un número que difiere del correcto solo por un factor de 10 (ej: 1400 en vez de 14,000), pregunta directamente "¿Quisiste decir 14,000?" en vez de pedir que explique todo el razonamiento

---

EXTENSIÓN (ESTRICTO):
- RESPUESTA CORRECTA: máximo 1-2 oraciones (validación breve + siguiente pregunta). NO expandas ni repitas.
- ENSEÑANZA de concepto nuevo: máximo 80 palabras (3-4 oraciones)
- SEGUIMIENTO o repregunta: máximo 40 palabras (2 oraciones)
- UNA pregunta al final
- Sin emojis
- Habla como persona real
- PROHIBIDO dar "clases magistrales" de 200+ palabras antes de preguntar
- PROHIBIDO repetir lo que el estudiante ya dijo correctamente
- Si el estudiante cumplió los criterios de verificación, NO hagas preguntas de profundización adicionales. Cierra y avanza.`

  // ═══════════════════════════════════════════════════════════════
  // BLOQUE ESTÁTICO 2: Instrucciones de actividad (CACHEABLE)
  // ═══════════════════════════════════════════════════════════════
  const { teaching, verification } = activity

  // Backwards compatibility: support both old and new structure
  // Old: activity.agent_instruction, New: activity.teaching.agent_instruction
  const agentInstruction = teaching?.agent_instruction || (activity as { agent_instruction?: string }).agent_instruction || ''
  const targetLength = teaching?.target_length || '150-200 palabras'
  const teachingContext = teaching?.context || ''

  // Old: verification.criteria[], New: verification.success_criteria.must_include[]
  const successCriteria = verification.success_criteria?.must_include || (verification as { criteria?: string[] }).criteria || []
  const minCompleteness = verification.success_criteria?.min_completeness ?? 60
  const isOpenEnded = verification.open_ended === true

  // Guidance for question approach by activity type
  const questionTypeGuidance: Record<string, string> = {
    explanation: `TIPO DE PREGUNTAS: CERRADAS (comprensión directa)
- Pregunta sobre lo que ACABAS de explicar, no sobre lo que el estudiante debería deducir
- Ej: "¿Cuáles son los 3 tipos de...?", "¿Qué diferencia hay entre X e Y?"
- Si responde bien, puedes profundizar: "¿Y por qué es importante esa diferencia?"
- NO pidas análisis ni aplicación — eso es para la práctica`,
    practice: `TIPO DE PREGUNTAS: CERRADAS → ABIERTAS (progresión)
- Empieza con preguntas específicas del escenario: "¿Qué tipo de riesgo ves aquí?"
- Si responde correctamente, abre: "¿Por qué clasificaste así?" o "¿Qué harías diferente si...?"
- Si se equivoca, mantén cerradas para guiar: "¿Es tipo A o tipo B?"`,
    reflection: `TIPO DE PREGUNTAS: ABIERTAS (razonamiento)
- No hay respuesta única correcta
- Evalúa calidad del razonamiento, no keywords
- Profundiza: "¿Por qué piensas eso?" "¿Puedes dar un ejemplo?"`,
    closing: `TIPO DE PREGUNTAS: ABIERTAS (síntesis)
- Busca que el estudiante integre lo aprendido
- "¿Qué fue lo más importante?" "¿Cómo lo aplicarías?"
- Acepta cualquier reflexión genuina`,
  }
  const questionGuidance = questionTypeGuidance[activityType] || questionTypeGuidance.explanation

  const verificationBlock = isOpenEnded
    ? `VERIFICACIÓN - Pregunta ABIERTA: "${verification.question}"
Aspectos a observar (guías, no criterios estrictos): ${successCriteria.join(' | ')}
Máximo intentos: ${maxAttempts}

${questionGuidance}

PREGUNTA ABIERTA — REGLAS:
- NO hay una única respuesta correcta
- Acepta cualquier posición coherente y fundamentada
- Si el estudiante reflexiona genuinamente, permite avanzar
- NO corrijas opiniones válidas, enriquece la discusión`
    : `VERIFICACIÓN - Pregunta: "${verification.question}"
Criterios: ${successCriteria.join(' | ')}
Umbral de aprobación: ${minCompleteness}%
Máximo intentos: ${maxAttempts}

${questionGuidance}

VERIFICACIÓN FLEXIBLE:
- Evalúa COMPRENSIÓN del concepto, no perfección de formato
- Acepta respuestas correctas aunque no sigan el formato exacto
- Si la comprensión es clara (${minCompleteness}%+), permite avanzar
- Máximo ${maxAttempts} intentos, luego ofrece continuar de todos modos`

  // Image block — contextual directives by activity type + showWhen
  // Supports both images[] (new) and image (legacy)
  const teachingImages = teaching?.images || (teaching?.image ? [teaching.image] : [])
  const validImages = teachingImages.filter((img) => img.description)
  let imageBlock = ''
  if (validImages.length > 0) {
    const actType = activity.type

    const typeDirectives: Record<string, string> = {
      explanation: 'Usa las imágenes para ilustrar tu explicación. Describe qué muestra cada imagen y conecta con el concepto que estás enseñando. Después haz preguntas de comprensión sobre lo que acabas de explicar.',
      practice: 'El estudiante debe usar las imágenes como referencia para resolver el ejercicio. Pregunta qué elementos aplican al caso.',
      reflection: 'Pide al estudiante que relacione lo aprendido con lo que muestran las imágenes.',
      closing: 'Usa las imágenes como resumen visual. Pide al estudiante que las explique con lo aprendido.',
    }
    const typeDirective = typeDirectives[actType] || typeDirectives.explanation

    const showDirectives: Record<string, string> = {
      on_start: 'Ya visible para el estudiante. Referencíala directamente.',
      on_reference: 'Se mostrará cuando la menciones. Introdúcela naturalmente.',
      on_demand: 'Solo se muestra si el estudiante pide. Menciona que está disponible.',
    }

    const imageEntries = validImages.map((img, i) => {
      const showDirective = showDirectives[img.showWhen || 'on_reference']
      return `  ${i + 1}. "${img.description}" — ${showDirective}`
    }).join('\n')

    imageBlock = `
IMÁGENES DE APOYO (${validImages.length}):
${imageEntries}
${typeDirective}
- Usa SOLO las descripciones proporcionadas, no inventes detalles sobre las imágenes.`
  }

  const staticBlock2 = `
${typeTemplate}

ACTIVIDAD ${position} de ${totalActivities}${isFirstActivity ? ' (primera)' : ''}${isLastActivity ? ' (última)' : ''}

INSTRUCCIÓN:
${agentInstruction}
${teachingContext ? `\nCONTEXTO: ${teachingContext}` : ''}
${imageBlock}

EXTENSIÓN ESPERADA: ${targetLength}

${verificationBlock}

${activity.commonMistakes?.length ? `ERRORES COMUNES A DETECTAR:
${activity.commonMistakes.map(m => `- ${m}`).join('\n')}
Si detectas estos errores, NO corrijas directamente. Pregunta qué los llevó a esa conclusión.` : ''}

Tu objetivo: que el estudiante comprenda y responda "${verification.question}".`

  // ═══════════════════════════════════════════════════════════════
  // BLOQUE DINÁMICO: Estado actual (NO cacheable - cambia cada mensaje)
  // ═══════════════════════════════════════════════════════════════

  // Construir historial optimizado (comprimido)
  const conversationHistory = context.recentMessages.map(m => ({
    role: m.role,
    content: m.content
  }))
  const optimizedHistory = buildOptimizedContext(conversationHistory, 8)

  let dynamicPrompt = `
---
ESTADO ACTUAL DE LA CONVERSACIÓN:

HISTORIAL RECIENTE (optimizado):
${optimizedHistory}
`

  // Memoria de actividades completadas
  if (completedActivities.length > 0) {
    dynamicPrompt += `\nACTIVIDADES COMPLETADAS: ${completedActivities.length} (no volver a enseñar)`
  }

  // Resultado de verificación si existe
  if (verificationResult) {
    if (verificationResult.completed || verificationResult.ready_to_advance) {
      if (isLastActivity) {
        dynamicPrompt += `\n\nESTADO: COMPLETADA (ÚLTIMA ACTIVIDAD)
- Felicita en 1 oración
- Resume en máximo 3 bullets los puntos clave aprendidos en TODA la lección
- Cierra con una pregunta de aplicación práctica: "¿Qué concepto aplicarías primero?"
- NO repitas el resumen si el estudiante responde. Acepta su respuesta y despídete en 1-2 oraciones.
- TOTAL máximo: 120 palabras`
      } else if (nextActivity) {
        const nextTeaching = nextActivity.teaching?.agent_instruction || (nextActivity as { agent_instruction?: string }).agent_instruction || ''
        const nextQuestion = nextActivity.verification.question

        dynamicPrompt += `\n\nESTADO: COMPLETADA - TRANSICIÓN A SIGUIENTE ACTIVIDAD

⚠️ REGLA ANTI-REPETICIÓN: Si ya felicitaste o resumiste en tu mensaje anterior, NO vuelvas a hacerlo. Ve DIRECTO al nuevo tema.

FORMATO DE TRANSICIÓN (máximo 80 palabras total):
1. "Correcto/Bien." (1 palabra de cierre, NO resumas lo que ya dijiste)
2. Introduce el nuevo tema en 2-3 oraciones máximo
3. Termina con la pregunta de verificación

SIGUIENTE ACTIVIDAD:
Instrucción: ${nextTeaching}
Pregunta: "${nextQuestion}"

⛔ PROHIBIDO en transiciones:
- Listar lo que "aprendimos" o "cubrimos" (ya lo sabe, lo acaba de hacer)
- Repetir felicitaciones ("Excelente trabajo", "Has demostrado...")
- Dar resúmenes antes de avanzar
- Mensajes de más de 100 palabras`
      } else {
        dynamicPrompt += `\n\nESTADO: COMPLETADA - "Bien." + avanza al siguiente tema directamente. Sin resumen.`
      }
    } else {
      // Usar response_type para feedback más específico
      const responseType = verificationResult.response_type || 'partial'

      // Construir guía según tipo de respuesta
      let responseGuidance = ''
      const matchedStr = verificationResult.criteriaMatched.length > 0
        ? `Lo que el estudiante YA dijo bien: ${verificationResult.criteriaMatched.join('; ')}`
        : ''
      const missingStr = verificationResult.criteriaMissing.length > 0
        ? `Lo que falta por cubrir: ${verificationResult.criteriaMissing.join('; ')}`
        : ''

      switch (responseType) {
        case 'partial':
          if (attempts >= 3) {
            // Después de 3+ intentos parciales: dar la respuesta y avanzar
            responseGuidance = `RESPUESTA PARCIAL TRAS ${attempts} INTENTOS — Ya es suficiente, avanza.
${matchedStr}
${missingStr}

CÓMO RESPONDER (máximo 60-80 palabras):
1. "Bien. [Lo que dijo bien]. Para completar: [lo que faltó explicado brevemente]."
2. NO hagas más preguntas sobre este tema
3. Avanza directamente al siguiente tema o actividad
⚠️ El estudiante ya intentó ${attempts} veces. Explica lo que falta y AVANZA.`
          } else {
            responseGuidance = `RESPUESTA PARCIAL — Va por buen camino.
${matchedStr}
${missingStr}

CÓMO RESPONDER (máximo 60-80 palabras):
1. "Bien pensado. [Lo que dijo bien] es correcto."
2. UNA pregunta enfocada en lo que falta
3. NO repitas lo que ya respondió correctamente
⛔ NO uses "Perfecto" ni "Exacto" — la respuesta está incompleta`
          }
          break
        case 'incorrect':
          responseGuidance = `RESPUESTA INCORRECTA — Hay errores conceptuales.
CÓMO RESPONDER (máximo 60-80 palabras):
1. "No exactamente." o "Piénsalo de nuevo."
2. Da UNA pista concreta que guíe hacia la respuesta correcta
3. Reformula la pregunta de forma más específica
⛔ NUNCA digas "Perfecto", "Exacto", "Correcto" ni "Muy bien" cuando la respuesta es incorrecta
⛔ NUNCA digas "Interesante" como sustituto de señalar el error — sé honesto pero amable`
          break
        case 'off_topic':
          responseGuidance = `RESPUESTA FUERA DE TEMA — Redirige amablemente.
CÓMO RESPONDER (máximo 40 palabras):
1. "Buena observación, pero enfoquémonos en..."
2. Reformula la pregunta directamente`
          break
        case 'correct':
          responseGuidance = `RESPUESTA CORRECTA.
CÓMO RESPONDER (máximo 2-3 oraciones):
1. "Correcto." o "Exacto." + 1 oración de por qué es importante
2. Siguiente pregunta o transición inmediata
⛔ NO expandas ni repitas lo que el estudiante ya dijo`
          break
      }

      // Extraer escenario de la pregunta para hacerlo más explícito
      const questionText = verification.question
      const scenarioMatch = questionText.match(/[Tt]e describo[^:]*:\s*([^?]+)/i) ||
                            questionText.match(/[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?([^?]+)/i) ||
                            questionText.match(/[Oo]bserva[:]?\s*([^?]+)/i) ||
                            questionText.match(/[Ss]i tenemos[^?]+:\s*([^?]+)/i) ||
                            questionText.match(/[Ee]n\s+(?:un[ao]?\s+)?(taller|fábrica|obra|cocina|hospital)[^?]*/i)
      const extractedScenario = scenarioMatch ? scenarioMatch[1]?.trim() || scenarioMatch[0]?.trim() : null

      dynamicPrompt += `\n\nESTADO: ${responseGuidance}
Nivel de comprensión: ${verificationResult.understanding_level} | Confianza: ${verificationResult.confidence}
Intento: ${attempts}/${maxAttempts}

🎯 TEMA DE LA PREGUNTA (NO cambiar de tema, pero REFORMULA — no repitas textual):
"${verification.question}"

⚠️ REGLA CRÍTICA: Si el estudiante ya respondió parte de la pregunta correctamente, NO vuelvas a preguntar eso. Enfócate SOLO en lo que falta.

${extractedScenario ? `📍 ESCENARIO A USAR (OBLIGATORIO):
"${extractedScenario}"
- Todas tus pistas deben referirse a ESTE escenario
- NO inventes escenarios nuevos` : ''}

⛔ PROHIBIDO:
- Repetir la misma pregunta textual que ya hiciste
- Ignorar lo que el estudiante ya respondió bien
- Volver a explicar conceptos de actividades anteriores
- Cambiar el escenario por uno "más simple"`
    }
  }

  // Manejo de tangentes
  if (tangentCount >= 3) {
    dynamicPrompt += `\n\nLÍMITE OFF-TOPIC: Redirige al tema.`
  }

  // Estudiante dice "no sé" - replantear usando el escenario de la PREGUNTA DE VERIFICACIÓN
  if (studentIsUnsure) {
    // Extraer el escenario de la pregunta para hacerlo más explícito
    const questionText = verification.question
    const scenarioMatch = questionText.match(/[Tt]e describo[^:]*:\s*([^?]+)/i) ||
                          questionText.match(/[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?([^?]+)/i) ||
                          questionText.match(/[Oo]bserva[:]?\s*([^?]+)/i) ||
                          questionText.match(/[Ss]i tenemos[^?]+:\s*([^?]+)/i) ||
                          questionText.match(/[Ee]n\s+(?:un[ao]?\s+)?(taller|fábrica|obra|cocina|hospital)[^?]*/i)
    const extractedScenario = scenarioMatch ? scenarioMatch[1]?.trim() || scenarioMatch[0]?.trim() : null

    dynamicPrompt += `\n\n🚨 ESTUDIANTE DICE "NO SÉ" - APLICA TÉCNICA "NO OPT OUT"

PREGUNTA ORIGINAL: "${verification.question}"
${extractedScenario ? `ESCENARIO: "${extractedScenario}"` : ''}

TU RESPUESTA DEBE:
1. Descomponer la pregunta en partes pequeñas
2. Usar el MISMO escenario (no inventar otro)
3. Ofrecer opciones concretas para guiar

EJEMPLO DE RESPUESTA CORRECTA:
"Vamos por partes. ${extractedScenario ? `En el escenario que te describí, ` : ''}había [elemento del escenario].
¿Qué tipo de [concepto] crees que representa: [opción A] o [opción B]?"

⛔ NO HAGAS:
- Re-explicar toda la teoría
- Listar todos los tipos o categorías otra vez
- Inventar un escenario nuevo "más simple"
- Volver a conceptos de actividades anteriores`
  }

  // Scaffolding docente: progresión de 5 intentos
  if (attempts >= 1) {
    const hintStrategies: Record<number, string> = {
      1: `INTENTO 2/5 — PISTA SUTIL:
- Reformula la pregunta de otra manera
- Da una pista indirecta: "Piensa en..." o "Fíjate en..."
- NO des la respuesta`,
      2: `INTENTO 3/5 — PISTA DIRECTA:
- Señala exactamente qué falta: "Te falta considerar..."
- Da opciones: "¿Es A o B?"
- Reduce la pregunta a algo más específico`,
      3: `INTENTO 4/5 — EXPLICA Y PIDE QUE REPITA:
- Explica el concepto que falta en 2-3 oraciones
- Pide que el estudiante lo repita con sus propias palabras
- "Entonces, con eso en mente, ¿cómo responderías?"`,
      4: `INTENTO 5/5 — DA LA RESPUESTA Y AVANZA:
- Da la respuesta completa en 2-3 oraciones claras
- Pregunta: "¿Tiene sentido?" o "¿Queda claro?"
- Cuando el estudiante confirme, avanza a la siguiente actividad
- NO hagas más preguntas sobre este tema`,
    }
    const hintLevel = Math.min(attempts, 4)
    dynamicPrompt += `\n\n${hintStrategies[hintLevel]}`
  }

  // Instrucciones específicas según clasificación de intención
  if (intentClassification && !intentClassification.is_on_topic) {
    dynamicPrompt += `\n\nPREGUNTA OFF-TOPIC DETECTADA: "${intentClassification.topic_mentioned || 'tema no relacionado'}"
Estrategia: ${intentClassification.suggested_response_strategy}
- Si es brief_redirect: respuesta muy breve (1-2 oraciones) y vuelve al tema
- Si es firm_redirect: indica amablemente que el tema está fuera de alcance`
  }

  return {
    staticBlocks: [
      {
        type: 'text',
        text: staticBlock1,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: staticBlock2,
        cache_control: { type: 'ephemeral' }
      }
    ],
    dynamicPrompt
  }
}

/**
 * Obtener posición de actividad actual (1-indexed)
 */
function getActivityPosition(context: CurrentActivityContext): number {
  return context.activityIdx + 1
}

/**
 * Construir PROMPT para generar mensaje de bienvenida
 * La IA genera el mensaje, no está hardcodeado
 */
export function buildWelcomePrompt(
  activityContext: CurrentActivityContext,
  lessonContext?: LessonContext
): string {
  const { isFirstActivity, lessonTitle, courseInstructor } = activityContext

  // Construir contexto técnico si existe
  const technicalContext = lessonContext ? buildTechnicalContextBlock(lessonContext) : ''

  if (isFirstActivity) {
    return `${courseInstructor}

TAREA: Genera un mensaje de bienvenida para iniciar la lección "${lessonTitle}".
${technicalContext}

INSTRUCCIONES:
- Preséntate brevemente (tu nombre y rol)
- Menciona el tema de hoy
- Pregunta si tiene experiencia previa con el tema
- Tono conversacional, como persona real
- Sin emojis
- Máximo 3 oraciones
- Termina con UNA pregunta abierta

NO incluyas: "Bienvenido", saludos formales, exclamaciones exageradas.`
  }

  return `${courseInstructor}

TAREA: Genera un mensaje de transición para continuar con la siguiente actividad de "${lessonTitle}".
${technicalContext}

INSTRUCCIONES:
- Reconoce brevemente el progreso
- Invita a continuar
- Pregunta si hay dudas antes de avanzar
- Tono conversacional
- Sin emojis
- Máximo 2 oraciones

NO incluyas: "¡Excelente!", exclamaciones exageradas, felicitaciones largas.`
}
