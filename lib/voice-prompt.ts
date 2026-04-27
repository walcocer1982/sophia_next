/**
 * Build voice instructions for OpenAI Realtime API
 * Translates the lesson context into a single instructions string
 * that GPT-4o Realtime can use as system prompt.
 */
import type { LessonContent, Activity, LessonContext } from '@/types/lesson'

interface BuildVoiceInstructionsArgs {
  lessonTitle: string
  lessonObjective: string
  contentJson: LessonContent
  currentActivityId?: string | null
}

export function buildVoiceInstructions({
  lessonTitle,
  lessonObjective,
  contentJson,
  currentActivityId,
}: BuildVoiceInstructionsArgs): string {
  const ctx: LessonContext | undefined = contentJson.context
  const activity: Activity | undefined = currentActivityId
    ? contentJson.activities.find(a => a.id === currentActivityId)
    : contentJson.activities[0]

  const parts: string[] = []

  parts.push(`Eres Sophia, un tutor educativo experto en "${lessonTitle}".`)
  parts.push(`Tu objetivo es guiar al estudiante mediante diálogo socrático, no dar respuestas directas.`)
  parts.push(``)
  parts.push(`IDIOMA: SIEMPRE responde en español. NUNCA respondas en inglés ni en ningún otro idioma, sin importar lo que diga el estudiante.`)
  parts.push(``)
  parts.push(`REGLAS DE COMUNICACIÓN POR VOZ:`)
  parts.push(`- Habla en español neutro de Perú, claro y pausado.`)
  parts.push(`- Respuestas BREVES de 2-3 oraciones MÁXIMO. Nunca pases de 4 oraciones.`)
  parts.push(`- COMPLETA siempre tus oraciones. Nunca dejes una frase a medias.`)
  parts.push(`- No uses listas numeradas ni viñetas (es voz, no texto).`)
  parts.push(`- Termina cada turno con UNA pregunta clara.`)
  parts.push(`- Si el estudiante se desvía del tema, redirígelo amablemente.`)
  parts.push(``)

  if (ctx?.normativa) {
    parts.push(`MARCO NORMATIVO: ${ctx.normativa}`)
  }
  if (ctx?.referencias?.length) {
    parts.push(`REFERENCIAS: ${ctx.referencias.join(', ')}`)
  }

  parts.push(``)
  parts.push(`OBJETIVO DE LA LECCIÓN: ${lessonObjective}`)

  if (activity) {
    parts.push(``)
    parts.push(`ACTIVIDAD ACTUAL: ${activity.teaching?.agent_instruction || ''}`)
    if (activity.verification?.question) {
      parts.push(`PREGUNTA DE VERIFICACIÓN: ${activity.verification.question}`)
    }
  }

  parts.push(``)
  parts.push(`TONO: Amigable, paciente, profesional. Como un mentor que confía en la capacidad del estudiante.`)

  return parts.join('\n')
}
