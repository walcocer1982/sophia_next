import { anthropic, extractJsonFromMarkdown, callAndParseJson } from '@/lib/anthropic'
import type { Activity, ActivityCompletionResult, UnderstandingLevel, ResponseType, VerificationHints, Rubric } from '@/types/lesson'
import { normalizeLevel } from '@/lib/levels'

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

${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO DE LA CONVERSACIÓN PREVIA (intervenciones del instructor; las respuestas del alumno ya están arriba):\n${conversationHistory.slice(-4).filter((m) => m.role === 'assistant').map((m) => `Instructor: ${m.content}`).join('\n\n')}` : ''}

TAREA:
Evalúa la CALIDAD DEL RAZONAMIENTO del estudiante, no si menciona palabras clave.

REGLA CRÍTICA — CONTEXTO DE CONVERSACIÓN:
Antes de evaluar, revisa la CONVERSACIÓN PREVIA. Si el instructor hizo una pregunta de seguimiento diferente a la original, evalúa si el estudiante respondió correctamente a ESA pregunta. No marques como "off_topic" si el estudiante responde a lo que le preguntaron.

REGLA — TOLERANCIA A ERRORES DE VOZ (Whisper): si una palabra suena parecida a un término del tema, interpretala como ese término y procedé como si la hubiera dicho bien. NO descartes un criterio ni señales debilidad por eso — son artefactos técnicos. Si la INTENCIÓN está clara en el contexto, el criterio está cumplido.

CRITERIOS PARA PREGUNTA ABIERTA:
- ¿Demuestra reflexión genuina sobre el tema?
- ¿Articula una posición o perspectiva propia?
- ¿Conecta conceptos aprendidos con su razonamiento?
- ¿La respuesta tiene profundidad mínima (no es monosílaba ni evasiva)?

REGLA PRINCIPAL: Si el estudiante muestra pensamiento crítico y engagement con el tema, es SUFICIENTE para avanzar. No busques una respuesta "perfecta".

NIVELES DE DOMINIO (4 niveles oficiales, definiciones operacionales claras):

- "memorized" = EN INICIO: Responde muy básico, monosilábico, o A VECES NO RESPONDE. Repuesta vacía, irrelevante, o solo "sí/no/no sé". Mínimo de palabras y NO aborda lo que se preguntó.

- "understood" = EN PROCESO: TRATA de responder pero NO SE LE ENTIENDE BIEN. Respuesta vaga, confusa, o solo cubre 1 criterio de forma incompleta. Hay intento pero no claridad.

- "applied" = LOGRADO: Cumple MÁS DE UN criterio de la actividad. Cubre al menos 2 de los criterios "must_include" con claridad, sin errores conceptuales graves. Este es el nivel ESPERADO cuando responde bien.

- "analyzed" = DESTACADO: SUSTENTA su respuesta. Más allá de cumplir criterios, da una RAZÓN, una EXPLICACIÓN, un ARGUMENTO de por qué. Por ejemplo: "elijo X porque cuando pasa Y, entonces Z" — hay justificación clara.

REGLAS CRÍTICAS PARA CLASIFICAR:
- Contá los criterios de "must_include" que la respuesta cubre con claridad:
  * 0 criterios cubiertos + respuesta básica/vacía → memorized (INICIO)
  * 1 criterio cubierto parcialmente, intento confuso → understood (PROCESO)
  * 2 o más criterios cubiertos con claridad → applied (LOGRADO)
  * Cualquier nivel + SUSTENTACIÓN/argumento del por qué → analyzed (DESTACADO)
- La SUSTENTACIÓN es la marca de DESTACADO. Sin sustentación es máximo Logrado.
- "Profundidad cognitiva" NO es el criterio — el criterio es CUMPLIR los criterios + SUSTENTAR.
- Ante duda entre understood y applied: si cubre 2+ criterios claros → applied.
- Ante duda entre applied y analyzed: si da el por qué (argumento, no solo lista) → analyzed.

⚠️ ANTI-SESGO CONSERVADOR — leelo antes de clasificar:
Tendés a defaultear a "understood" por seguridad. NO LO HAGAS. Si la respuesta
cumple los criterios, escalá al nivel que corresponde. Castigar a un estudiante
con "understood" cuando demostró "applied" o "analyzed" es UN ERROR que afecta
su nota final. Si dudás entre dos niveles, SUBÍ al más alto, no bajés al más bajo.

EJEMPLOS DE ESCALACIÓN (estudia estos patrones):

Ejemplo 1 — applied (LOGRADO):
  Criterios: ["ventilación para evacuar gases", "desate de rocas sueltas", "sostenimiento"]
  Respuesta: "Ventilar primero, después hacer el desate y poner pernos"
  → criteriaMatched: 3/3 (los 3 criterios cubiertos con palabras propias)
  → understanding_level: "applied"  ← NO "understood", cumple 2+ criterios
  → Sin sustentación explícita del POR QUÉ → no llega a analyzed

Ejemplo 2 — analyzed (DESTACADO):
  Criterios: ["elige una fase específica", "la justifica con argumento razonado"]
  Respuesta: "La perforación porque determina cuánto se avanza y qué tan fragmentada termina la roca"
  → criteriaMatched: 2/2 (eligió "perforación" + dio argumento causal)
  → understanding_level: "analyzed"  ← NO "understood", da una RELACIÓN
     causa-efecto explícita ("determina X y Y")
  → Es DESTACADO porque la justificación conecta causa con consecuencia

PATRÓN CLAVE: una respuesta con relación CAUSA→CONSECUENCIA explícita
("porque", "lo que hace que", "esto produce", "determina que") sobre 2+
criterios = analyzed. NO bajes a understood por timidez.

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [NÚMEROS de "ASPECTOS A OBSERVAR" que la respuesta cubre con claridad, ej: [1,3] — solo los números],
  "criteriaMissing": [NÚMEROS de "ASPECTOS A OBSERVAR" que la respuesta NO cubre, ej: [2] — solo los números],
  "completeness_percentage": number (0-100),
  "understanding_level": "memorized" | "understood" | "applied" | "analyzed",
  "response_type": "correct" | "partial" | "incorrect" | "off_topic",
  "feedback": "feedback conciso y constructivo (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low",
  "ready_to_advance": boolean,
  "needs_scaffolding": boolean,
  "next_subquestion": "string o null"
}

REGLA CRÍTICA — criteriaMatched/criteriaMissing son los NÚMEROS de la lista "ASPECTOS A OBSERVAR" de arriba (ej: [1,3]). NO inventes descripciones ni copies texto: usa SOLO los números de la lista. Si un aspecto no aplica, no lo agregues.

REGLAS PARA ready_to_advance (PREGUNTA ABIERTA — más permisivo):
- true si el estudiante demuestra reflexión genuina (completeness >= 40%)
- true si articula una posición coherente, aunque no cubra todos los aspectos
- false SOLO si la respuesta es evasiva, monosílaba o completamente off-topic

REGLAS PARA needs_scaffolding (DESGLOSE — para preguntas abiertas):
- true SOLO si: response_type=partial Y completeness < 40% Y NO es off_topic
- false si la respuesta es razonablemente completa O si es off_topic
- En preguntas abiertas, profundizar UNA sola vez ("¿por qué piensas eso?") cuenta como scaffolding

REGLAS PARA next_subquestion:
- Si needs_scaffolding=true: una sub-pregunta CORTA que pida profundizar o dar un ejemplo
- NUNCA reveles la respuesta esperada en la sub-pregunta
- NUNCA listes opciones para que elija (ej: ~"¿es A, B o C?"~)
- null si needs_scaffolding=false

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

${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO DE LA CONVERSACIÓN PREVIA (intervenciones del instructor; las respuestas del alumno ya están arriba):\n${conversationHistory.slice(-4).filter((m) => m.role === 'assistant').map((m) => `Instructor: ${m.content}`).join('\n\n')}` : ''}

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

REGLA — TOLERANCIA A ERRORES DE VOZ (Whisper): si una palabra suena parecida a un término del tema, interpretala como ese término y NO bajes el nivel ni descartes un criterio por eso. Solo cuestioná si cambia el SIGNIFICADO conceptual.

NIVELES DE DOMINIO (clasifica por LOGRO del objetivo, no por estilo del lenguaje):
- "memorized" = EN INICIO: Respuesta con errores conceptuales o tan incompleta que NO demuestra dominio mínimo del tema. Necesita repaso.
- "understood" = EN PROCESO: Parcialmente correcta. Idea general OK pero le faltan elementos clave o tiene confusiones menores. Va por buen camino.
- "applied" = LOGRADO: Cumple los criterios de la actividad. Sabe el tema — sea por memoria correcta, paráfrasis o ejemplo. ESTE es el nivel esperado cuando responde bien.
- "analyzed" = DESTACADO: Va MÁS ALLÁ de lo pedido. Aporta ejemplo propio no requerido, conecta con otro tema, identifica matices, o propone variantes.

IMPORTANTE:
- Memorizar correctamente una definición = LOGRADO (no inicio).
- Equivocarse o tener errores conceptuales = INICIO.
- "Profundidad cognitiva" NO es el criterio — el criterio es DOMINIO DEL OBJETIVO.

⚠️ ANTI-SESGO CONSERVADOR — leelo antes de clasificar:
Tendés a defaultear a "understood" por seguridad. NO LO HAGAS. Si la respuesta
cumple los criterios, escalá al nivel que corresponde. Castigar a un estudiante
con "understood" cuando demostró "applied" o "analyzed" es UN ERROR que afecta
su nota final. Si dudás entre dos niveles, SUBÍ al más alto, no bajés al más bajo.

EJEMPLOS DE ESCALACIÓN:

Ejemplo 1 — applied (LOGRADO):
  Pregunta: "¿Qué pasos se ejecutan después de la voladura?"
  Criterios: ["ventilación para evacuar gases", "desate de rocas", "sostenimiento"]
  Respuesta: "Ventilar primero, después desate y poner pernos"
  → criteriaMatched: 3/3 con palabras propias
  → understanding_level: "applied"  ← NO "understood"

Ejemplo 2 — analyzed (DESTACADO):
  Pregunta: "¿Cuál fase decide la productividad y por qué?"
  Criterios: ["elige fase específica", "justifica con argumento"]
  Respuesta: "La perforación porque determina cuánto se avanza y qué tan fragmentada termina la roca"
  → criteriaMatched: 2/2 + relación CAUSA→CONSECUENCIA explícita
  → understanding_level: "analyzed"  ← NO "understood", da el POR QUÉ

PATRÓN CLAVE: relación causa-efecto explícita ("porque", "determina que",
"esto produce", "lo que hace que") sobre 2+ criterios = analyzed. NO bajes
a understood por timidez.

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [NÚMEROS de "CRITERIOS DE ÉXITO" que la respuesta cumple, ej: [1,3] — solo los números, NO el texto],
  "criteriaMissing": [NÚMEROS de "CRITERIOS DE ÉXITO" que la respuesta NO cumple, ej: [2] — solo los números],
  "completeness_percentage": number (0-100),
  "understanding_level": "memorized" | "understood" | "applied" | "analyzed",
  "response_type": "correct" | "partial" | "incorrect" | "off_topic",
  "feedback": "feedback conciso y constructivo (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low",
  "ready_to_advance": boolean,
  "needs_scaffolding": boolean,
  "next_subquestion": "string o null"
}

REGLAS PARA response_type:
- "correct": Cumple todos los criterios clave (completeness >= 80%)
- "partial": Cumple algunos criterios pero falta profundidad (40-79%)
- "incorrect": Tiene errores conceptuales o información equivocada
- "off_topic": La respuesta no está relacionada con la pregunta
- "no sé" / "no conozco" / "es la primera vez" / no responde → "incorrect" (NUNCA "off_topic"): es un no-saber, NO un desvío de tema

REGLAS PARA ready_to_advance:
- true si completeness_percentage >= ${minCompleteness}
- true si understanding_level es igual o superior a "${expectedLevel}"
- false si el estudiante claramente no entendió el concepto central

REGLAS PARA needs_scaffolding (DESGLOSE):
- true SOLO si: response_type=partial o incorrect Y NO está listo para avanzar Y NO es off_topic
- false si: ya está listo para avanzar, o si es off_topic, o si ya cumple criterios
- El propósito: descomponer la pregunta cuando el estudiante dio respuesta parcial/cero pero está en tema

REGLAS PARA next_subquestion (cuando needs_scaffolding=true):
- Sub-pregunta CORTA (máx 1 oración) que apunte a UN criterio faltante específico
- Debe inducir al estudiante a llegar al concepto SIN dárselo:
  ✅ Pregunta por la consecuencia, el propósito, el "qué pasaría si no"
  ✅ Pregunta por un escenario o ejemplo concreto
  ❌ NUNCA reveles el nombre del concepto del criterio
  ❌ NUNCA listes opciones para que elija ("¿es A, B o C?")
  ❌ NUNCA digas "te falta hablar de X"
- null si needs_scaffolding=false

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
    .slice(-3)
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
 * Prompt de verificación BASADO EN RÚBRICA (Fase B).
 * Reemplaza el "manual" genérico por las 4 respuestas-referencia pre-generadas:
 * el modelo COMPARA contra anclas concretas → prompt corto (~1000-1300 tok).
 * Devuelve `level` en la escala nueva (beginning/developing/achieved/outstanding);
 * el caller lo mapea al enum viejo.
 */
function buildRubricVerificationPrompt(
  activity: Activity,
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] | undefined,
  rubric: Rubric,
  criteria: string[],
  minCompleteness: number,
  expectedLevel: UnderstandingLevel,
  wasExplained: boolean,
): string {
  const expectedNew = expectedLevel
  const capClause = wasExplained
    ? `\n- POST-EXPLICACIÓN: ya le explicaste el concepto en esta actividad. Si el alumno solo REPITE lo explicado → "developing" como máximo; NO marques "achieved" ni "outstanding".`
    : ''

  return `Eres un evaluador pedagógico. Comparás la respuesta del alumno con las respuestas-referencia de cada nivel y devolvés un veredicto.

PREGUNTA: ${activity.verification.question}

CRITERIOS (must_include):
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

RESPUESTAS-REFERENCIA POR NIVEL (son EJEMPLOS de cómo se ve cada nivel, NO la única respuesta válida — una respuesta correcta distinta también vale):
- beginning (inicio):     ${rubric.beginning}
- developing (proceso):   ${rubric.developing}
- achieved (logrado):     ${rubric.achieved}
- outstanding (destacado): ${rubric.outstanding}

RESPUESTA DEL ESTUDIANTE:
"${userMessage}"
${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO PREVIO (intervenciones del instructor):\n${conversationHistory.slice(-4).filter((m) => m.role === 'assistant').map((m) => `Instructor: ${m.content}`).join('\n\n')}` : ''}

CÓMO EVALUAR:
- Elegí el nivel cuya referencia MÁS se parezca en la COMPRENSIÓN demostrada, NO en las palabras exactas. Acepta paráfrasis, sinónimos y ejemplos propios.
- La condición real de aprobar son los CRITERIOS (must_include); las referencias solo calibran el nivel.
- Ante duda entre dos niveles, SUBÍ al más alto (no castigues por timidez).
- Avanza (ready_to_advance=true) si completeness >= ${minCompleteness}% o el nivel es "${expectedNew}" o superior.
- "no sé" / "no conozco" / "es la primera vez" / no responde → response_type "incorrect" (NUNCA "off_topic").
- Si la respuesta trata de OTRO tema distinto al de ESTA pregunta (contesta algo que no se preguntó acá — p.ej. responde sobre el tema de otra actividad) → response_type "off_topic". Distinción: "incorrect" = intento sobre ESTE tema pero equivocado; "off_topic" = habla de un tema diferente al preguntado.
- Tolerá errores de transcripción de voz (Whisper): si una palabra suena parecida a un término del tema, interpretala como ese término.${capClause}

Devolvé SOLO este JSON (sin texto adicional):
{
  "completed": boolean,
  "level": "beginning" | "developing" | "achieved" | "outstanding",
  "criteriaMatched": [NÚMEROS de criterios cumplidos, ej: [1,3] — solo números],
  "criteriaMissing": [NÚMEROS de criterios NO cumplidos],
  "completeness_percentage": number (0-100),
  "response_type": "correct" | "partial" | "incorrect" | "off_topic",
  "feedback": "feedback conciso y constructivo (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low",
  "ready_to_advance": boolean,
  "needs_scaffolding": boolean,
  "next_subquestion": "string o null"
}`
}

/**
 * Verificar si el estudiante completó la actividad usando IA
 * Usa la nueva estructura success_criteria con min_completeness y understanding_level
 */
export async function verifyActivityCompletion(
  userMessage: string,
  activity: Activity,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  wasExplained: boolean = false,
): Promise<ActivityCompletionResult> {
  // Backwards compatibility: support both old and new structure
  // Old: verification.criteria[], New: verification.success_criteria.must_include[]
  // AJUSTE: Reducido min_completeness por defecto de 60% a 50% para ser más permisivo
  const successCriteria = activity.verification.success_criteria || {
    must_include: (activity.verification as { criteria?: string[] }).criteria || [],
    min_completeness: 50,
    understanding_level: 'developing' as const
  }
  const minCompleteness = successCriteria.min_completeness ?? 50
  const expectedLevel = normalizeLevel(successCriteria.understanding_level)
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

  // Construir contexto para verificación. Si Sophia ya dio una mini-explicación
  // didáctica en esta actividad, agregamos un bloque que le pide al evaluador
  // distinguir entre repetición de lo enseñado vs integración con palabras propias.
  const explainedClause = wasExplained
    ? `\n\nCONTEXTO IMPORTANTE: Sophia YA EXPLICÓ el concepto en esta actividad antes de esta respuesta.
REGLA POST-EXPLICACIÓN (CAP DE NIVEL):
- Si el estudiante solo REPITE lo que Sophia le acaba de explicar → understanding_level = "memorized" (Inicio)
- Si el estudiante INTEGRA la explicación con sus palabras / un ejemplo propio / una conexión → understanding_level = "understood" (Proceso) MÁXIMO
- NUNCA marques "applied" (Logrado) ni "analyzed" (Destacado) después de explicación — esos niveles requieren que el estudiante haya demostrado dominio SIN que se le enseñara primero.
- Cap absoluto post-explicación: understood (Proceso).`
    : ''

  // Fase B: si la actividad tiene rúbrica pre-generada, usamos el prompt corto
  // basado en referencias. Si no, el camino tradicional (manual genérico).
  const rubric = activity.verification.rubric
  const useRubric = !!rubric &&
    !!rubric.beginning && !!rubric.developing && !!rubric.achieved && !!rubric.outstanding

  const verificationPrompt = useRubric
    ? buildRubricVerificationPrompt(activity, accumulatedResponse, conversationHistory, rubric, successCriteria.must_include, minCompleteness, expectedLevel, wasExplained)
    : (isOpenEnded
        ? buildOpenEndedVerificationPrompt(agentInstruction, activity, accumulatedResponse, conversationHistory, hintsSection, expectedLevel)
        : buildStandardVerificationPrompt(agentInstruction, activity, accumulatedResponse, conversationHistory, successCriteria, hintsSection, minCompleteness, expectedLevel)
      ) + explainedClause

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku 4.5 (3.5 fue deprecada). Rápido + económico.
      max_tokens: 400, // ⚡ OPTIM #1: bajado de 500 (el veredicto JSON cabe holgado)
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

    // Parsear JSON response (tolera markdown code blocks y prosa alrededor)
    const result: ActivityCompletionResult = JSON.parse(
      extractJsonFromMarkdown(content.text)
    )

    // ⚡ El verificador ahora devuelve NÚMEROS (1-based) en criteriaMatched/
    // criteriaMissing para ahorrar tokens de salida. Los expandimos a los
    // strings literales del criterio para no cambiar nada aguas abajo
    // (dashboard, attempts). Tolera strings por si el modelo igual los manda.
    const expandCriteria = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return []
      return arr
        .map((v) => (typeof v === 'number' ? successCriteria.must_include[v - 1] : v))
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    }
    result.criteriaMatched = expandCriteria(result.criteriaMatched)
    result.criteriaMissing = expandCriteria(result.criteriaMissing)

    // Normalizar el nivel: el prompt de rúbrica devuelve `level` (escala nueva);
    // el prompt fallback devuelve understanding_level (escala vieja).
    // normalizeLevel unifica ambos al enum nuevo.
    const rawLevel = (result as unknown as { level?: string }).level
    result.understanding_level = normalizeLevel(rawLevel ?? result.understanding_level)

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

    // Defensa en profundidad: si Sophia ya enseñó, cap absoluto en 'developing'
    // (Proceso). El cap por código garantiza que aunque el AI ignore la regla
    // del prompt, el nivel nunca pase de Proceso post-explicación.
    if (wasExplained && (result.understanding_level === 'achieved' || result.understanding_level === 'outstanding')) {
      result.understanding_level = 'developing'
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
  // Para preguntas abiertas en fallback: matchear contra must_include literales por
  // keywords. Antes devolvía ["Respuesta con reflexión"] genérico que era inútil
  // para el reporte. Ahora intenta dar crédito real por los criterios cubiertos.
  if (isOpenEnded) {
    const wordCount = userMessage.trim().split(/\s+/).length
    const hasSubstance = wordCount >= 10
    const messageLower = userMessage.toLowerCase()
    const criteria = activity.verification.success_criteria?.must_include || []

    const criteriaMatched: string[] = []
    const criteriaMissing: string[] = []
    for (const criterion of criteria) {
      const keywords = criterion
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 4)
      const hasMatch = keywords.some((k) => messageLower.includes(k))
      if (hasMatch) criteriaMatched.push(criterion)
      else criteriaMissing.push(criterion)
    }

    const total = criteria.length
    const completeness_percentage = total > 0
      ? Math.round((criteriaMatched.length / total) * 100)
      : (hasSubstance ? 60 : 20)

    return {
      completed: hasSubstance && criteriaMatched.length === total,
      criteriaMatched,
      criteriaMissing,
      completeness_percentage,
      understanding_level: hasSubstance ? 'developing' : 'beginning',
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
    understanding_level: 'developing' as UnderstandingLevel, // Default en fallback
    response_type,
    feedback: completed
      ? '¡Excelente! Has comprendido los conceptos clave.'
      : 'Bien, pero falta profundizar en algunos puntos.',
    confidence: 'low', // Baja confianza en fallback
    ready_to_advance,
  }
}

/**
 * Verificación BINARIA para cursos con metodología CODE (instruccional).
 *
 * No evalúa comprensión ni rúbrica socrática: solo decide si el estudiante
 * completó / confirmó el paso (o reportó su resultado). Devuelve el mismo
 * shape que verifyActivityCompletion para que el flujo de chat/stream y la
 * auto-progresión funcionen sin cambios.
 */
export async function verifyStepCompletion(
  userMessage: string,
  activity: Activity,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<ActivityCompletionResult> {
  const stepInstruction =
    activity.teaching?.agent_instruction ||
    activity.verification?.question ||
    'el paso indicado'

  const history = (conversationHistory || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Estudiante' : 'Sophia'}: ${m.content}`)
    .join('\n')

  const prompt = `Eres un verificador de progreso en una sesión INSTRUCCIONAL paso a paso.

PASO A COMPLETAR:
${stepInstruction}

HISTORIAL RECIENTE:
${history || '(sin historial)'}

ÚLTIMO MENSAJE DEL ESTUDIANTE:
"${userMessage}"

¿El estudiante completó o confirmó este paso (lo hizo, pegó evidencia del resultado, o indicó que lo terminó)? Reportar un error mientras lo intenta NO cuenta como completado.

Responde ÚNICAMENTE con JSON:
{"completed": true|false, "reason": "breve"}`

  try {
    const { completed } = await callAndParseJson<{ completed: boolean; reason?: string }>(
      prompt,
      { maxTokens: 150 }
    )
    return {
      completed,
      criteriaMatched: completed ? ['Paso completado'] : [],
      criteriaMissing: completed ? [] : ['Paso pendiente'],
      completeness_percentage: completed ? 100 : 0,
      understanding_level: 'achieved' as UnderstandingLevel, // No aplica en CODE
      response_type: (completed ? 'correct' : 'partial') as ResponseType,
      feedback: '',
      confidence: 'high',
      ready_to_advance: completed,
    }
  } catch {
    // Fail-safe: no avanzar si la verificación falla
    return {
      completed: false,
      criteriaMatched: [],
      criteriaMissing: ['Paso pendiente'],
      completeness_percentage: 0,
      understanding_level: 'achieved' as UnderstandingLevel,
      response_type: 'partial' as ResponseType,
      feedback: '',
      confidence: 'low',
      ready_to_advance: false,
    }
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
