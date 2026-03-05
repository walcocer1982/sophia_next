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
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929' // Chat principal (instructor)
export const HAIKU_MODEL = 'claude-3-5-haiku-20241022'    // Moderación + Clasificación (tareas básicas)
