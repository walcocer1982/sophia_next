import { z } from 'zod'

/**
 * Validador para POST /api/survey/submit.
 * - npsScore: entero 1-10 (variante adaptada — sin 0)
 * - npsReason: texto libre opcional, máximo 300 chars (el "por qué" del NPS)
 * - utility: enum con los 4 valores del modelo SurveyUtility
 */
export const surveySubmitSchema = z.object({
  sessionId: z.string().min(1, 'sessionId requerido'),
  npsScore: z.number().int().min(1).max(10),
  npsReason: z.string().max(300).optional().nullable(),
  utility: z.enum(['VERY_USEFUL', 'USEFUL', 'LOW_USEFUL', 'NOT_USEFUL']),
  language: z.enum(['ES', 'EN']).optional(),
})

export type SurveySubmitInput = z.infer<typeof surveySubmitSchema>

export const UTILITY_LABELS: Record<SurveySubmitInput['utility'], string> = {
  VERY_USEFUL: 'Muy útil — voy a usarlo',
  USEFUL: 'Útil — algo me va a servir',
  LOW_USEFUL: 'Poco útil — no sé cuándo lo usaré',
  NOT_USEFUL: 'Nada útil — no me sirve',
}
