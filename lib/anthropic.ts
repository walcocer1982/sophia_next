import Anthropic from '@anthropic-ai/sdk'

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined
}

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-build',
  })

if (process.env.NODE_ENV !== 'production') {
  globalForAnthropic.anthropic = anthropic
}

// Modelos optimizados por caso de uso
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929' // Planner/instructor (calidad)
// Chat del alumno (kiosko + /learn): Haiku 4.5 es mucho más rápido (menor
// time-to-first-token) y suficiente para la conversación tutelada en vivo.
export const TUTOR_MODEL = 'claude-haiku-4-5'
// Moderación + Clasificación (tareas básicas). Antes apuntaba a
// claude-3-5-haiku-20241022, RETIRADO el 19-feb-2026 → las llamadas fallaban
// con 404 y caían al fallback. Haiku 4.5 es el reemplazo y baja la latencia
// del gate previo a la respuesta.
export const HAIKU_MODEL = 'claude-haiku-4-5'

/**
 * Extract a JSON payload from a model response that may wrap it in a
 * ```json fenced block and/or surround it with prose. Superset of the three
 * ad-hoc extractors that previously lived in activity-verification,
 * intent-classification and moderation.
 */
export function extractJsonFromMarkdown(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const body = fenced ? fenced[1].trim() : trimmed
  const obj = body.match(/\{[\s\S]*\}/)
  return obj ? obj[0] : body
}

/**
 * Send a single-user-message prompt and parse the response as JSON.
 * Throws if the model returns a non-text block or invalid JSON — callers
 * are expected to wrap this in their own try/catch with a sane fallback.
 */
export async function callAndParseJson<T>(
  prompt: string,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<T> {
  const response = await anthropic.messages.create({
    model: opts.model ?? HAIKU_MODEL,
    max_tokens: opts.maxTokens ?? 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected non-text response from Anthropic')
  }

  return JSON.parse(extractJsonFromMarkdown(content.text)) as T
}
