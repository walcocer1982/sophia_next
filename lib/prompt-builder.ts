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
  methodology?: 'REFLECTIVE' | 'CODE'  // Metodología del curso (default REFLECTIVE)
  projectBrief?: unknown               // Propuesta acordada en la sesión-bisagra (CODE personalizado)
  wasExplained?: boolean               // Sophia ya dio una mini-explicación didáctica en esta actividad
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

  // (función de detección "fuerte" abajo — patrones específicos)
  void 0

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
 * Detector "fuerte" de no-sé: el estudiante no tiene ninguna base sobre el tema
 * y necesita que se le ENSEÑE el concepto, no que se le hagan más preguntas.
 *
 * Distinto de isStudentUnsure() porque excluye:
 * - "no estoy seguro" / "no me animo" (duda, sí tiene algo)
 * - "no entiendo" (puede ser de la pregunta, no del tema)
 *
 * Solo dispara para confesiones literales de desconocimiento total del tema.
 */
export function isStudentUnsureStrong(message: string): boolean {
  const trimmed = message.trim().toLowerCase()
  const strongPatterns = [
    /^no\s*s[eé][.!]*$/i,                       // "no sé" / "no se" puro
    /^no\s*(lo\s*)?s[eé][.,!\s]*nada/i,         // "no sé nada"
    /no\s*tengo\s*(ni\s*)?idea/i,                // "no tengo idea"
    /ni\s*(la\s+m[aá]s\s+m[ií]nima\s+)?idea/i,  // "ni idea"
    /no\s*conozco/i,                             // "no conozco X"
    /nunca\s*(lo\s+)?(he\s+|hab[ií]a\s+)?(visto|escuchado|o[ií]do)/i, // "nunca lo había escuchado"
    /no\s*me\s*ha\s*explicado/i,                 // "no me ha explicado"
    /no\s*lo\s*entiendo\s*nada/i,                // "no lo entiendo nada"
    /^pas[oó][.!]*$/i,                           // "paso"
    /^me\s*rindo[.!]*$/i,                        // "me rindo"
  ]
  return strongPatterns.some(p => p.test(trimmed))
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
  explanation: `MODO: EXPLICACIÓN (introduce un concepto nuevo y verifica comprensión)

ESTRUCTURA OBLIGATORIA — MÁXIMO 3 TURNOS antes de plantear la pregunta de verificación:
1. TURNO 1: Pregunta exploratoria breve (1 oración) para sondear qué ya sabe.
2. TURNO 2: Explica SOLO lo que falte (máximo 3-4 oraciones). NO repitas lo que ya demostró saber.
3. TURNO 3 (OBLIGATORIO): Plantea TEXTUAL la pregunta literal del bloque "VERIFICACIÓN - Pregunta:" del bloque DATOS DE ACTIVIDAD.

REGLAS DURAS:
- NO parafrasees la pregunta de verificación. NO la dividas en sub-preguntas. NO la suavices.
- NO sigas haciendo preguntas exploratorias después del turno 3.
- Si el estudiante responde antes del turno 3 con algo que cubre los criterios, AVANZA al turno 3 inmediatamente.`,

  practice: `MODO: PRÁCTICA (aplicar el concepto a un escenario concreto)

ESTRUCTURA OBLIGATORIA — MÁXIMO 2 TURNOS antes de plantear la pregunta de verificación:
1. TURNO 1: Presenta el escenario concreto (2-3 oraciones máximo). Sin pregunta floja del estilo "¿qué te parece?".
2. TURNO 2 (OBLIGATORIO): Plantea TEXTUAL la pregunta literal del bloque "VERIFICACIÓN - Pregunta:" del bloque DATOS DE ACTIVIDAD.

REGLAS DURAS:
- NO uses preguntas de calentamiento ("qué tipo de X", "qué harías primero") como sustituto de la pregunta de verificación.
- Si responde mal, da feedback ESPECÍFICO sobre qué le falta y RE-PLANTEA la MISMA pregunta de verificación.
- NO cambies la pregunta entre intentos — el AI evaluador necesita consistencia.`,

  reflection: `MODO: REFLEXIÓN (razonamiento personal, sin respuesta única)

ESTRUCTURA OBLIGATORIA — 1 TURNO para llegar a la pregunta:
1. TURNO 1: Contextualiza brevemente (1-2 oraciones) y plantea TEXTUAL la pregunta literal del bloque "VERIFICACIÓN - Pregunta:".
2. Si la respuesta es superficial, profundiza con "¿por qué piensas eso?" o "¿podés dar un ejemplo?".

REGLAS DURAS:
- ACEPTA cualquier posición/elección que el estudiante justifique. NO hay respuesta "correcta".
- Evalúa: (a) ¿eligió/se posicionó claramente? (b) ¿lo justificó con un argumento coherente?
- NO sugieras "la respuesta correcta" — eso anularía la reflexión.`,

  closing: `MODO: CIERRE (síntesis final de la lección — NO introducir conceptos nuevos)

ESTRUCTURA OBLIGATORIA — 1 TURNO:
1. TURNO 1: Resume en 2-3 puntos clave la LECCIÓN COMPLETA + plantea TEXTUAL la pregunta literal del bloque "VERIFICACIÓN - Pregunta:" de síntesis.
2. Acepta la síntesis del estudiante con sus propias palabras.
3. Felicita brevemente al confirmar la respuesta.

REGLAS DURAS:
- NO inicies otra mini-lección. NO introduzcas datos nuevos. Es el FINAL.
- NO hagas preguntas exploratorias previas — el estudiante ya pasó por toda la lección.`
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
    methodology = 'REFLECTIVE',
    projectBrief,
    wasExplained = false,
  } = context
  const isCodeMethodology = methodology === 'CODE'

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

  const staticBlock1 = `IDENTIDAD: Eres Sophia, instructora educativa (MUJER). Usa SIEMPRE género femenino al referirte a ti misma (instructora, mentora, lista, atenta).

REGLA CRÍTICA — GÉNERO DEL ESTUDIANTE:
- NO asumas el género del estudiante. Usa lenguaje neutro o masculino genérico.
- Di "pensemos" en lugar de "pensemos juntas/juntos".
- Di "veamos" en lugar de "miremos juntos/juntas".
- Evita "estás listo/lista" — usa "te invito a continuar" o similar.

REGLA CRÍTICA DE PRESENTACIÓN:
- Te presentas como "Sophia, tu instructora" SOLO en el PRIMER mensaje de la lección.
- En los mensajes siguientes, NUNCA digas "Soy Sophia" ni "Soy tu instructora" — el estudiante ya lo sabe.
- Continúa la conversación de forma natural sin repetir presentaciones.

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
- Si el estudiante cumplió los criterios de verificación, NO hagas preguntas de profundización adicionales. Cierra y avanza.

REGLA DE TURN-TAKING — TODA RESPUESTA TUYA DEBE TERMINAR CON CIERRE EXPLÍCITO:
Cada mensaje tuyo debe terminar en UNA de estas tres formas, nunca otra:
1. Una PREGUNTA dirigida al estudiante (la pregunta de verificación, una sub-pregunta de desglose, o profundización dentro de los criterios).
2. UN CIERRE EXPLÍCITO de la lección ("Gracias por participar.", "¡Buena clase!") — solo cuando se completó la última actividad.
3. UNA TRANSICIÓN explícita a la siguiente actividad terminando con la pregunta de verificación de esa actividad.

PROHIBIDO terminar con un statement neutro tipo "Eso es así." / "Es importante." / "Por eso es clave." — porque deja al estudiante sin saber si tiene que responder. Si querés cerrar un concepto, hacelo + plantea la siguiente pregunta en la MISMA respuesta.

PROHIBIDO ABSOLUTO — PREGUNTAS RETÓRICAS / FILLER (desperdician turnos sin aportar a la evaluación):
Cualquier pregunta cuya respuesta NO se mide contra los criterios de éxito de la actividad actual cae en esta categoría. Tres familias típicas:
1. Confirmaciones disfrazadas: cualquier pregunta que solo pide validación ("¿se entiende?", "¿clara la idea?", "¿no es cierto?", "¿queda claro?").
2. Profundizaciones fuera de criterios: preguntar sobre subtemas que NO aparecen en los criterios de éxito (eso es inventar trabajo extra).
3. Pedidos de auto-evaluación al estudiante ("¿con tus palabras cómo lo dirías?", "¿qué te parece esto?").
Si querés cerrar un punto, hacelo con afirmación corta ("Exacto.", "Correcto.") y avanzá. NO inventes preguntas de seguimiento — desviás al estudiante y generás turnos vacíos.`

  // Variante INSTRUCCIONAL (metodología CODE): sesión guiada paso a paso. Sophia
  // instruye en lugar de hacer mayéutica y solo confirma que el estudiante
  // completó cada paso. Este bloque es DELIBERADAMENTE GENÉRICO — el dominio
  // concreto (qué herramientas, qué emojis, qué formato) lo definen las
  // instrucciones de cada actividad y el campo "instructor" del curso, ambos
  // editables en la DB. El bloque REFLECTIVE queda intacto.
  const codeStaticBlock1 = `IDENTIDAD: Eres Sophia, instructora (MUJER). Usa SIEMPRE género femenino al referirte a ti misma. NO asumas el género del estudiante (usa lenguaje neutro).

MODO INSTRUCCIONAL — NO SOCRÁTICO:
- Esta es una sesión guiada paso a paso.
- Da la instrucción del paso de forma CLARA, DIRECTA y ACCIONABLE.
- NO uses método socrático ni preguntas de razonamiento. NO ocultes la respuesta: aquí SÍ se dan instrucciones explícitas.
- Espera a que el estudiante confirme que completó el paso (o pegue evidencia del resultado). Entonces valida brevemente y avanza al siguiente paso.
- Si el estudiante reporta un error, ayúdalo a resolverlo con instrucciones concretas; luego continúa.
- NO hay nota por comprensión: lo único que importa es si completó el paso.

REGLA CRÍTICA DE PRESENTACIÓN:
- Te presentas como "Sophia, tu instructora" SOLO en el PRIMER mensaje. Luego nunca repitas la presentación.

${courseInstructor}

CURSO: ${lessonTitle}
${lessonObjective ? `OBJETIVO: ${lessonObjective}` : ''}
${technicalContextBlock}

${lessonKeyPoints.length > 0 ? `PUNTOS CLAVE:
${lessonKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

---

EXTENSIÓN:
- Instrucción de un paso: directa, lo necesario para ejecutarlo.
- Confirmación tras completar: 1 oración + siguiente paso.
- Habla como persona real.
- Para el formato (uso de emojis, símbolos, bloques estructurados, listas, longitud) sigue las instrucciones específicas de cada actividad.`

  // Inyección condicional del proyecto acordado (cursos CODE basados en proyecto).
  // Si y solo si la metodología es CODE y existe un brief en la sesión, se anexa
  // al bloque estático 1 como contexto vivo del proyecto del estudiante. Para
  // cursos sin brief queda byte-idéntico al CODE actual.
  const projectBriefBlock =
    isCodeMethodology && projectBrief
      ? `\n\nPROYECTO ACORDADO DEL ESTUDIANTE:
${JSON.stringify(projectBrief, null, 2)}

Refiérete a las entidades concretas del brief cuando instruyas cada paso. Para el formato (emojis, símbolos, bloques estructurados, longitud) sigue las instrucciones específicas de la actividad.`
      : ''

  const effectiveStaticBlock1 =
    (isCodeMethodology ? codeStaticBlock1 : staticBlock1) + projectBriefBlock

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
  // Default true for backwards compatibility - existing activities without flag are evaluative
  const isEvaluative = verification.is_evaluative !== false

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

  const verificationBlock = !isEvaluative
    ? `INTERACCIÓN NO EVALUATIVA - Pregunta de participación: "${verification.question}"

${questionGuidance}

REGLAS — NO ES EVALUACIÓN:
- Esta pregunta NO cuenta para la nota.
- Es solo para fomentar participación, transición o engagement.
- Acepta CUALQUIER respuesta razonable del estudiante y avanza inmediatamente.
- NO apliques criterios estrictos, NO cuentes intentos.
- Si responde algo coherente con el tema, da reconocimiento breve y continúa.
- Si no responde bien, simplemente continúa sin penalizar.`
    : isOpenEnded
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
      return `  [${i + 1}] "${img.description}" — ${showDirective}`
    }).join('\n')

    imageBlock = `
IMÁGENES DE APOYO (${validImages.length}) — visibles en el panel del estudiante:
${imageEntries}

REGLA CRÍTICA — INTEGRAR IMÁGENES EN LA CONVERSACIÓN:
- Refiérete a las imágenes EN MOMENTOS CLAVE de tu explicación, no las dejes solo en el panel.
- Usa frases naturales como: "Mira la imagen 1, donde se ve...", "Fíjate en la imagen del jumbo...", "Como muestra la foto...", "Si observas el diagrama...".
- Conecta cada imagen con el concepto exacto que estás enseñando o la pregunta que harás después.
- Cuando hagas una pregunta basada en la imagen, INVITA al estudiante a observarla: "Observa la imagen 2 y dime, ¿qué tipo de perforación ves?".
- ${typeDirective}
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
        dynamicPrompt += `\n\nESTADO: COMPLETADA (ÚLTIMA ACTIVIDAD — ES EL FINAL DE LA LECCIÓN)

CÓMO RESPONDER (60-90 palabras MÁXIMO):
1. Validación corta en 1 oración: "Exacto, lo entendiste."
2. Resumen breve en 2-3 bullets de lo APRENDIDO EN TODA LA LECCIÓN.
3. Cierre con UNA frase de despedida ("Gracias por participar." o similar).

⛔ PROHIBIDO EN EL CIERRE:
- Hacer MÁS preguntas (la lección terminó — no hay siguiente actividad que preparar)
- Preguntas retóricas tipo "¿te das cuenta?", "¿ves cómo?", "¿cómo crees que se mide el éxito?"
- Introducir temas nuevos que no estaban en la lección
- Pedir "una última reflexión" o "una idea más"

Si el estudiante responde después de tu cierre, agradecé en 1-2 oraciones y NO continúes el diálogo.`
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

      // Si el AI evaluador sugiere desglose, tiene prioridad sobre las guías
      // genéricas por response_type: Sophia debe hacer la sub-pregunta SUGERIDA
      // sin revelar la respuesta esperada.
      if (verificationResult.needs_scaffolding && verificationResult.next_subquestion) {
        dynamicPrompt += `\n\nESTADO: DESGLOSE — la respuesta está parcial/incompleta pero el estudiante está en tema. Hacé UNA sub-pregunta específica para que llegue al criterio que falta.
${matchedStr}
${missingStr}

SUB-PREGUNTA SUGERIDA POR EL EVALUADOR:
"${verificationResult.next_subquestion}"

CÓMO RESPONDER (máximo 50-70 palabras):
1. Reconocé lo que dijo bien en 1 oración corta ("Bien, eso es parte de la respuesta").
2. Hacé la SUB-PREGUNTA sugerida arriba (o una variante que apunte al MISMO criterio faltante).
3. NO repitas la pregunta original entera.

⛔ PROHIBIDO al hacer la sub-pregunta:
- Revelar el nombre del concepto que falta (no digas "te falta hablar de X")
- Listar opciones para que elija ("¿es A, B o C?")
- Dar la respuesta dentro de la pregunta misma

Nivel acumulado actual: ${verificationResult.understanding_level}

🎯 TEMA ORIGINAL (NO repetir textual, ya está planteado):
"${verification.question}"`
        // Saltar la guía tradicional por response_type — el desglose la reemplaza.
      } else {
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
      } // cierre del else (rama sin desglose)
    }
  }

  // Manejo de tangentes
  if (tangentCount >= 3) {
    dynamicPrompt += `\n\nLÍMITE OFF-TOPIC: Redirige al tema.`
  }

  // Estudiante dice "no sé": dos caminos según severidad y si ya fue explicado.
  // - "Fuerte" + primer intento + sin explicación previa → MINI-EXPLICACIÓN didáctica
  //   (el visitante no tiene base, hay que enseñar antes de seguir preguntando)
  // - "Suave" o segunda vez → reformulación con escenario (sin opciones reveladas)
  if (studentIsUnsure) {
    const isStrong = isStudentUnsureStrong(lastUserMessage)
    const firstTime = (attempts || 0) <= 1
    const shouldExplain = isStrong && firstTime && !wasExplained

    if (shouldExplain) {
      // Mini-explicación derivada de los criterios `must_include` de la actividad.
      // Sophia entrega el CONCEPTO base, no la respuesta a la pregunta.
      const criteria = verification.success_criteria?.must_include || []
      const criteriaList = criteria.length > 0
        ? criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
        : '(usar la información del bloque OBJETIVO de la actividad)'

      dynamicPrompt += `\n\n📚 ESTUDIANTE NO TIENE BASE — ENSEÑÁ ANTES DE PREGUNTAR

El estudiante dijo "no sé" / "no conozco" — necesita que le ENSEÑES el concepto, NO más preguntas.

CONCEPTOS QUE SE ESPERABAN (úsalos como base de la explicación):
${criteriaList}

CÓMO RESPONDER (90-120 palabras MÁXIMO):
1. Empezá con: "Te explico brevemente:" o "Va de menos a más:"
2. Explicá los conceptos en TUS PROPIAS PALABRAS, simples y concretas. NO los listes como bullets — armá 2-3 oraciones fluidas.
3. Cerrá con: "Ahora con esto en mente, [reformulá la pregunta de verificación]"

PREGUNTA ORIGINAL A REFORMULAR AL FINAL:
"${verification.question}"

⛔ PROHIBIDO:
- Empezar con la pregunta (primero ENSEÑÁ)
- Dar la respuesta exacta a la pregunta (solo el CONCEPTO base que necesita)
- Listar criterios literal (parafraseá)
- Texto >120 palabras
- Más preguntas exploratorias antes de la pregunta de verificación reformulada`
    } else {
      // Caso "suave" o ya hubo explicación previa → reformulación sin opciones reveladas
      const questionText = verification.question
      const scenarioMatch = questionText.match(/[Tt]e describo[^:]*:\s*([^?]+)/i) ||
                            questionText.match(/[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?([^?]+)/i) ||
                            questionText.match(/[Oo]bserva[:]?\s*([^?]+)/i)
      const extractedScenario = scenarioMatch ? scenarioMatch[1]?.trim() || scenarioMatch[0]?.trim() : null

      dynamicPrompt += `\n\n🚨 ESTUDIANTE DICE "NO SÉ" — DESCOMPONÉ SIN REVELAR

${wasExplained ? 'Ya le explicaste antes en esta actividad. No vuelvas a re-explicar todo.' : ''}
PREGUNTA ORIGINAL: "${verification.question}"
${extractedScenario ? `ESCENARIO: "${extractedScenario}"` : ''}

CÓMO RESPONDER (máx 60 palabras):
1. Hacé UNA sub-pregunta CONCRETA que ataque el criterio más simple primero
2. Usá el MISMO escenario (no inventes otro)
3. La sub-pregunta debe inducir, NO revelar la respuesta

⛔ PROHIBIDO:
- Listar opciones para que elija ("¿es A o B?")
- Dar la respuesta dentro de la sub-pregunta
- Re-explicar toda la teoría
- Cambiar el escenario por uno más simple`
    }
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
        text: effectiveStaticBlock1,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: isCodeMethodology
          ? `MODO INSTRUCCIONAL: Trata "${activity.verification.question}" como el PASO a completar. Da la instrucción para ejecutarlo y, cuando el estudiante confirme/pegue el resultado, valida brevemente y avanza. No apliques criterios socráticos ni de comprensión.\n\n${staticBlock2}`
          : staticBlock2,
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

// (buildWelcomePrompt eliminado: era código muerto — el mensaje de
// bienvenida real se construye inline en app/api/chat/welcome/route.ts)
