import { anthropic } from '@/lib/anthropic'
import type { Activity, ActivityCompletionResult } from '@/types/lesson'

/**
 * Verificar si el estudiante completó la actividad usando IA
 */
export async function verifyActivityCompletion(
  userMessage: string,
  activity: Activity,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<ActivityCompletionResult> {
  // Construir contexto para verificación
  const verificationPrompt = `Eres un evaluador pedagógico experto. Tu tarea es evaluar si un estudiante ha comprendido correctamente un tema.

TEMA: ${activity.teaching.main_topic}

PREGUNTA DE VERIFICACIÓN: ${activity.verification.question}

CRITERIOS DE ACEPTACIÓN (el estudiante debe demostrar comprensión de TODOS):
${activity.verification.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

RESPUESTA DEL ESTUDIANTE:
"${userMessage}"

${conversationHistory && conversationHistory.length > 0 ? `\nCONTEXTO DE LA CONVERSACIÓN PREVIA:\n${conversationHistory.slice(-5).map((m) => `${m.role === 'user' ? 'Estudiante' : 'Instructor'}: ${m.content}`).join('\n\n')}` : ''}

TAREA:
Evalúa si la respuesta del estudiante cumple con TODOS los criterios de aceptación.

Responde en formato JSON con esta estructura EXACTA:
{
  "completed": boolean,
  "criteriaMatched": [lista de criterios cumplidos],
  "criteriaMissing": [lista de criterios NO cumplidos],
  "feedback": "feedback conciso para el estudiante (máximo 2 oraciones)",
  "confidence": "high" | "medium" | "low"
}

REGLAS:
- "completed" es true SOLO si TODOS los criterios están cumplidos
- Sé estricto pero justo: el estudiante debe demostrar comprensión real
- El feedback debe ser constructivo, no repetir los criterios
- confidence: "high" si es muy claro, "medium" si hay dudas, "low" si es ambiguo

Responde SOLO con el JSON, sin texto adicional.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
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
