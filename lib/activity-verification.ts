import { anthropic } from '@/lib/anthropic'
import { AI_CONFIG } from '@/lib/ai-config'
import type { Activity, ActivityCompletionResult } from '@/types/lesson'

/**
 * Construir prompt de verificación (exportado para debug)
 *
 * OPTIMIZACIÓN (2025-01-11): Historial conversacional eliminado
 * - Ahorro: ~200-500 tokens por verificación
 * - Claude mantiene memoria vía messages array (sin impacto en coherencia)
 */
export function buildVerificationPrompt(
  userMessage: string,
  activity: Activity
): string {
  return `Eres un evaluador pedagogico experto. Tu tarea es evaluar si un estudiante ha comprendido correctamente un tema.

TEMA: ${activity.teaching.main_topic}

PREGUNTA DE VERIFICACION: ${activity.verification.question}

CRITERIOS DE ACEPTACION (el estudiante debe demostrar comprension de TODOS):
${activity.verification.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

RESPUESTA DEL ESTUDIANTE:
"${userMessage}"

TAREA:
Evalua si la respuesta del estudiante cumple con TODOS los criterios de aceptacion.

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [lista de criterios cumplidos],
  "criteriaMissing": [lista de criterios NO cumplidos],
  "feedback": "feedback conciso para el estudiante (maximo 2 oraciones)",
  "confidence": "high" | "medium" | "low"
}

REGLAS:
- "completed" es true SOLO si TODOS los criterios estan cumplidos
- Se estricto pero justo: el estudiante debe demostrar comprension real
- El feedback debe ser constructivo, no repetir los criterios
- confidence: "high" si es muy claro, "medium" si hay dudas, "low" si es ambiguo

Responde SOLO con el JSON, sin texto adicional.`
}

/**
 * Verificar si el estudiante completó la actividad usando IA
 */
export async function verifyActivityCompletion(
  userMessage: string,
  activity: Activity
): Promise<ActivityCompletionResult> {
  const verificationPrompt = buildVerificationPrompt(userMessage, activity)

  try {
    const response = await anthropic.messages.create({
      model: AI_CONFIG.models.verification,
      max_tokens: AI_CONFIG.tokens.verification,
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

    return result
  } catch (error) {
    console.error('❌ Error verifying activity completion:', error)

    // Fallback: verificación simple por keywords
    return fallbackVerification(userMessage, activity)
  }
}

/**
 * Verificación fallback simple si la IA falla
 */
function fallbackVerification(
  userMessage: string,
  activity: Activity
): ActivityCompletionResult {
  const messageLower = userMessage.toLowerCase()
  const criteriaMatched: string[] = []
  const criteriaMissing: string[] = []

  // Verificación simple: buscar keywords de cada criterio
  activity.verification.criteria.forEach((criterion) => {
    const criterionKeywords = criterion
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > AI_CONFIG.fallback.keywordMinLength)

    const hasKeywords = criterionKeywords.some((keyword) =>
      messageLower.includes(keyword)
    )

    if (hasKeywords) {
      criteriaMatched.push(criterion)
    } else {
      criteriaMissing.push(criterion)
    }
  })

  const completed = criteriaMissing.length === 0

  return {
    completed,
    criteriaMatched,
    criteriaMissing,
    feedback: completed
      ? '¡Excelente! Has comprendido los conceptos clave.'
      : 'Bien, pero falta profundizar en algunos puntos.',
    confidence: 'low', // Baja confianza en fallback
  }
}

/**
 * Determinar si debe mostrarse un hint basado en intentos fallidos
 */
export function shouldShowHint(
  activity: Activity,
  failedAttempts: number
): { show: boolean; hintIndex: number } {
  if (!activity.verification.hints || activity.verification.hints.length === 0) {
    return { show: false, hintIndex: -1 }
  }

  // Mostrar hint cada 2 intentos fallidos
  if (failedAttempts > 0 && failedAttempts % 2 === 0) {
    const hintIndex = Math.min(
      Math.floor(failedAttempts / 2) - 1,
      activity.verification.hints.length - 1
    )
    return { show: true, hintIndex }
  }

  return { show: false, hintIndex: -1 }
}
