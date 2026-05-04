/**
 * Build voice instructions for OpenAI Realtime API
 * KEPT SHORT to avoid content_filter false positives in non-English (Spanish)
 * which truncate responses with status_details.reason="content_filter".
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

  parts.push(`Eres Sophia, instructora (mujer) en "${lessonTitle}".`)
  parts.push(`Habla siempre en español latino (Perú). Tono amigable y paciente.`)
  parts.push(`Refiérete a ti misma en femenino (instructora, lista, atenta).`)
  parts.push(`PERO al referirte al estudiante usa lenguaje NEUTRO o masculino genérico:`)
  parts.push(`  - Di "pensemos" en lugar de "pensemos juntas/juntos"`)
  parts.push(`  - Di "veamos" en lugar de "miremos juntos/juntas"`)
  parts.push(`  - Di "te invito a reflexionar" en vez de "estás listo/lista"`)
  parts.push(`  - No asumas el género del estudiante.`)
  parts.push(`NO te presentes; ya estás en conversación.`)
  parts.push(`Respuestas breves: 2-3 oraciones, completas, sin listas.`)
  parts.push(`Usa diálogo socrático: preguntas abiertas que activen razonamiento.`)
  parts.push(`Evita preguntas cerradas como "¿quieres saber más?" — simplemente continúa.`)
  parts.push(``)
  parts.push(`Objetivo: ${lessonObjective}`)

  if (activity?.teaching?.agent_instruction) {
    parts.push(`Tarea actual: ${activity.teaching.agent_instruction}`)
  }
  if (activity?.verification?.question) {
    parts.push(`Pregunta clave: ${activity.verification.question}`)
  }
  if (ctx?.normativa) {
    parts.push(`Marco normativo: ${ctx.normativa}`)
  }

  return parts.join('\n')
}
