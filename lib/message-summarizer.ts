/**
 * Sistema de compresión de contexto conversacional
 * Optimiza el historial de mensajes para reducir tokens manteniendo información clave
 *
 * Estrategia:
 * - Mensajes del estudiante: siempre completos (preservar intención)
 * - Mensajes del instructor: resumidos con énfasis en PREGUNTA + ESCENARIO
 */

/**
 * Extrae el ÚLTIMO escenario/ejemplo del mensaje del instructor
 * Crítico para mantener continuidad cuando estudiante dice "no sé"
 * IMPORTANTE: Busca el ÚLTIMO match para obtener el escenario más reciente
 */
function extractScenario(content: string): string | null {
  // Patrones que indican un escenario/ejemplo (con flag global para buscar todos)
  const scenarioPatterns = [
    /[Tt]e\s+describo\s+(?:un[ao]?\s+)?([^:]+?):\s*([^.?!]+)/g,
    /[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?(?:un[ao]?\s+)?([^.?!]+)/g,
    /[Pp]iensa\s+en\s+(?:un[ao]?\s+)?([^.?!]+)/g,
    /[Ee]n\s+(?:un[ao]?\s+)?(taller|fábrica|obra|oficina|almacén|laboratorio|cocina|hospital|construcción|mina|planta)[^.?!]*/gi,
    /[Ss]upongamos\s+que\s+([^.?!]+)/g,
    /[Pp]or\s+ejemplo[,:]?\s+(?:en\s+)?(?:un[ao]?\s+)?([^.?!]+)/g,
    /[Ee]jemplo[:]?\s+([^.?!]+)/g,
    /[Cc]onsidera\s+(?:un[ao]?\s+)?([^.?!]+)/g,
    // Patrones adicionales para escenarios educativos
    /[Oo]bserva[:]?\s+([^.?!]+)/g,
    /[Aa]naliza[:]?\s+(?:el\s+siguiente\s+)?([^.?!]+)/g,
    /[Cc]aso[:]?\s+(?:práctico[:]?\s+)?([^.?!]+)/g,
    /[Ss]ituación[:]?\s+([^.?!]+)/g,
    /[Ee]n\s+esta\s+situación[,:]?\s*([^.?!]+)/g,
    /[Cc]ontexto[:]?\s+([^.?!]+)/g,
    /[Ll]ee\s+(?:el\s+siguiente\s+)?([^.?!]+)/g,
    /[Vv]eamos\s+(?:un\s+)?(?:caso|ejemplo|situación)[:]?\s*([^.?!]+)/g,
    /[Aa]quí\s+(?:tienes|hay)\s+(?:un[ao]?\s+)?([^.?!]+)/g,
  ]

  // Buscar TODOS los matches y quedarse con el ÚLTIMO
  let lastScenario: string | null = null

  for (const pattern of scenarioPatterns) {
    // Reset regex lastIndex para cada patrón
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content)) !== null) {
      // Guardar cada match, el último será el más reciente en el texto
      lastScenario = match[0].trim()
    }
  }

  if (lastScenario) {
    // Limitar a 120 chars pero mantener completo si es más corto
    return lastScenario.length > 120 ? lastScenario.slice(0, 117) + '...' : lastScenario
  }

  return null
}

/**
 * Extrae la última pregunta de un mensaje del instructor
 * Las preguntas son críticas para mantener el contexto
 */
function extractLastQuestion(content: string): string | null {
  // Buscar oraciones que terminen en ?
  const sentences = content.split(/(?<=[.!?])\s+/)
  const questions = sentences.filter(s => s.trim().endsWith('?'))

  if (questions.length === 0) return null

  // Retornar la última pregunta (la más relevante)
  const lastQuestion = questions[questions.length - 1].trim()

  // Si la pregunta es muy larga, truncar pero mantener el final con ?
  if (lastQuestion.length > 150) {
    return '...' + lastQuestion.slice(-120)
  }

  return lastQuestion
}

/**
 * Detecta el tipo de mensaje del instructor y lo resume apropiadamente
 * CRÍTICO: Preservar ESCENARIO + PREGUNTA para continuidad pedagógica
 */
export function summarizeInstructorMessage(content: string): string {
  // Mensajes cortos: mantener completos
  if (content.length < 200) {
    return content
  }

  // Extraer la pregunta (si existe)
  const question = extractLastQuestion(content)
  // Extraer el escenario/ejemplo (CRÍTICO para "no sé")
  const scenario = extractScenario(content)

  // Construir contexto preservado
  const buildContext = () => {
    const parts: string[] = []
    if (scenario) parts.push(`ESCENARIO: "${scenario}"`)
    if (question) parts.push(`PREGUNTA: "${question}"`)
    return parts.join(' | ')
  }

  // 1. Validación de respuesta correcta
  if (content.includes('completado') ||
      content.includes('Excelente') ||
      content.includes('Perfecto') ||
      content.includes('Correcto')) {
    const ctx = buildContext()
    if (ctx) {
      return `[Validó respuesta. ${ctx}]`
    }
    return '[Validó respuesta correcta del estudiante]'
  }

  // 2. Redirección (guardrails)
  if (content.includes('fuera del alcance') ||
      content.includes('volvamos al tema') ||
      content.includes('mantengamos enfocados')) {
    const ctx = buildContext()
    return ctx ? `[Redirigió al tema. ${ctx}]` : '[Redirigió al tema de la lección]'
  }

  // 3. Repregunta / Pista - IMPORTANTE mantener escenario aquí
  if (content.includes('Piensa en') ||
      content.includes('Recuerda') ||
      content.includes('Pista:') ||
      content.includes('¿Qué parte')) {
    const ctx = buildContext()
    if (ctx) {
      return `[Dio pista. ${ctx}]`
    }
    return '[Dio pista para guiar al estudiante]'
  }

  // 4. Explicación con escenario y/o pregunta (caso más común)
  const ctx = buildContext()
  if (ctx) {
    return `[${ctx}]`
  }

  // 5. Explicación sin pregunta ni escenario - mantener más contexto
  const firstMeaningful = content.slice(0, 150).replace(/\n/g, ' ')
  return `[${firstMeaningful}...]`
}

/**
 * Construye contexto conversacional optimizado
 * - Últimos N mensajes
 * - Estudiante: completo
 * - Instructor: resumido con pregunta destacada
 */
export function buildOptimizedContext(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 5
): string {
  // Tomar solo los últimos N mensajes
  const recentMessages = messages.slice(-maxMessages)

  if (recentMessages.length === 0) {
    return 'Sin historial previo.'
  }

  return recentMessages.map((m) => {
    if (m.role === 'user') {
      // Estudiante: siempre completo
      return `[Estudiante]: ${m.content}`
    } else {
      // Instructor: resumido
      const summary = summarizeInstructorMessage(m.content)
      return `[Instructor]: ${summary}`
    }
  }).join('\n')
}

/**
 * Calcula estadísticas de optimización (útil para logging/debugging)
 */
export function getOptimizationStats(
  originalMessages: Array<{ role: string; content: string }>,
  optimizedContext: string
): {
  originalChars: number
  optimizedChars: number
  savingsPercent: number
} {
  const originalChars = originalMessages.reduce((sum, m) => sum + m.content.length, 0)
  const optimizedChars = optimizedContext.length
  const savingsPercent = originalChars > 0
    ? Math.round((1 - optimizedChars / originalChars) * 100)
    : 0

  return {
    originalChars,
    optimizedChars,
    savingsPercent
  }
}

/**
 * Comprime mensajes manteniendo estructura role/content para enviar a Claude
 * - Mensajes del estudiante: siempre completos
 * - Mensajes del instructor: resumidos con énfasis en la pregunta
 *
 * @returns Array de mensajes comprimidos listos para enviar a la API
 */
export function compressMessagesForAPI(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 6
): Array<{ role: 'user' | 'assistant'; content: string }> {
  // Tomar solo los últimos N mensajes
  const recentMessages = messages.slice(-maxMessages)

  return recentMessages.map((m) => {
    const role = m.role === 'user' ? 'user' : 'assistant'

    if (m.role === 'user') {
      // Estudiante: siempre completo (preservar intención)
      return { role, content: m.content }
    } else {
      // Instructor: comprimir manteniendo la pregunta visible
      return { role, content: summarizeInstructorMessage(m.content) }
    }
  })
}
