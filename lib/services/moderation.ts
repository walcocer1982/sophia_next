import { anthropic, HAIKU_MODEL } from '@/lib/anthropic'
import type { ModerationResult } from '@/types/lesson'

/**
 * Lista de respuestas comunes que obviamente son seguras
 */
const SAFE_QUICK_RESPONSES = [
  'si', 'sí', 'ok', 'vale', 'entendido', 'claro', 'continuar', 'siguiente',
  'adelante', 'de acuerdo', 'perfecto', 'gracias', 'listo', 'no', 'tal vez'
]

/**
 * Verifica si un mensaje es obviamente seguro (respuesta corta y simple)
 */
function isObviouslySafe(message: string): boolean {
  const normalized = message.toLowerCase().trim()

  // Respuestas muy cortas (<=3 palabras) que son respuestas comunes
  const words = normalized.split(/\s+/)
  if (words.length <= 3 && words.length > 0) {
    const allCommon = words.every(word =>
      SAFE_QUICK_RESPONSES.includes(word) ||
      /^[a-záéíóúñ]+$/.test(word)
    )
    if (allCommon) return true
  }

  // Mensajes muy cortos (<30 caracteres) sin palabras sospechosas
  if (normalized.length < 30 && !containsSuspiciousPatterns(normalized)) {
    return true
  }

  return false
}

/**
 * Detecta patrones sospechosos que requieren moderación
 */
function containsSuspiciousPatterns(message: string): boolean {
  const suspiciousPatterns = [
    /\b(porno|xxx|sexual)\b/i,
    /\b(idiota|estúpid|imbécil|mierda|carajo|joder)\b/i,
    /\b(robar|estafar|piratear|hackear)\b/i,
    /(https?:\/\/|www\.)/i,
  ]

  return suspiciousPatterns.some(pattern => pattern.test(message))
}

/**
 * Construye nota de contexto dinámicamente según el tema
 */
function buildContextNote(context?: { lessonTitle?: string }): string {
  const lessonName = context?.lessonTitle || 'educativo general'

  return `CONTEXTO EDUCATIVO IMPORTANTE:
Este es un curso de: "${lessonName}"

Es NORMAL y APROPIADO que los estudiantes mencionen términos técnicos del tema:
- Conceptos especializados de la materia
- Ejemplos prácticos relacionados con el curso
- Términos profesionales del área de estudio

EVALÚA EL CONTENIDO EN CONTEXTO EDUCATIVO. No bloquees términos técnicos apropiados.`
}

/**
 * Extrae JSON de texto que puede contener explicaciones adicionales
 */
function extractJSON(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const jsonMatch2 = cleanText.match(/\{[\s\S]*\}/)
  if (jsonMatch2) {
    return jsonMatch2[0]
  }

  return text
}

/**
 * Modera el contenido del mensaje del estudiante
 * para detectar contenido inapropiado
 *
 * NO registra incidentes en BD, solo interviene
 */
export async function moderateContent(
  message: string,
  context?: { lessonTitle?: string }
): Promise<ModerationResult> {
  // OPTIMIZACIÓN: Skip moderación para mensajes obviamente seguros
  if (isObviouslySafe(message)) {
    return {
      is_safe: true,
      violations: [],
      severity: 'none',
      requires_intervention: false,
    }
  }

  const contextNote = buildContextNote(context)

  const moderationPrompt = `Analiza si este mensaje de un estudiante contiene contenido inapropiado para un contexto educativo profesional.

${contextNote}

MENSAJE DEL ESTUDIANTE:
"${message}"

Categorías REALMENTE prohibidas:
1. sexual_content: Contenido sexual explícito
2. violence: Violencia personal explícita o amenazas
3. illegal_activities: Actividades ilegales
4. personal_attacks: Insultos o ataques personales al instructor
5. hate_speech: Discurso de odio
6. spam: Spam o promoción comercial

IMPORTANTE: Evalúa el mensaje en el CONTEXTO EDUCATIVO del curso.
Términos técnicos apropiados para el curso NO son violaciones.

Responde ÚNICAMENTE con JSON válido (sin markdown):
{"is_safe": true, "violations": [], "severity": "none", "requires_intervention": false}`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: moderationPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Respuesta inesperada de la API')
    }

    const jsonText = extractJSON(content.text)
    const result = JSON.parse(jsonText) as ModerationResult
    return result
  } catch (error) {
    console.error('Error en moderación:', error)
    // En caso de error, permitir por defecto (fail-open)
    return {
      is_safe: true,
      violations: [],
      severity: 'none',
      requires_intervention: false,
    }
  }
}

/**
 * Genera mensaje de intervención según severidad
 * Sin registrar en BD
 */
export function getInterventionMessage(
  moderation: ModerationResult,
  instructorSpecialty?: string
): string {
  if (moderation.severity === 'high') {
    return 'Lo siento, pero no puedo responder a ese tipo de contenido. Mantengamos nuestra conversación enfocada en el tema educativo de forma profesional y respetuosa.'
  }

  const specialty = instructorSpecialty || 'instructor'
  return `Como ${specialty}, prefiero que mantengamos la conversación enfocada en el tema de la lección. ¿Continuamos con la actividad actual?`
}
