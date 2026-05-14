/**
 * Build voice instructions for OpenAI Realtime API
 * KEPT SHORT to avoid content_filter false positives in non-English (Spanish)
 * which truncate responses with status_details.reason="content_filter".
 */
import type { LessonContent, Activity, LessonContext, TeachingImage } from '@/types/lesson'

interface BuildVoiceInstructionsArgs {
  lessonTitle: string
  lessonObjective: string
  contentJson: LessonContent
  currentActivityId?: string | null
}

function getActivityImages(activity: Activity | undefined): TeachingImage[] {
  if (!activity?.teaching) return []
  const images = activity.teaching.images
    ?? (activity.teaching.image ? [activity.teaching.image] : [])
  return images.filter(img => img.description)
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

  // Imágenes visibles en el panel del estudiante: Sophia debe relacionarlas
  // con lo que dice. Usa SOLO la descripción dada (no interpreta la imagen).
  const images = getActivityImages(activity)
  if (images.length > 0) {
    parts.push(``)
    parts.push(`IMÁGENES VISIBLES (${images.length}) en el panel del estudiante:`)
    images.forEach((img, i) => {
      const when = img.showWhen || 'on_reference'
      const cue =
        when === 'on_start'
          ? 'ya visible'
          : when === 'on_demand'
          ? 'solo si el estudiante pide'
          : 'aparece cuando la menciones'
      parts.push(`  [${i + 1}] (${cue}) ${img.description}`)
    })
    parts.push(`Refiérete a ellas en momentos clave: "Mira la imagen ${images.length === 1 ? '' : '1, '}donde se ve...", "Fíjate en...", "Como muestra la imagen...".`)
    parts.push(`Conecta cada imagen con el concepto que estás enseñando o con la pregunta que harás.`)
    parts.push(`Usa SOLO la descripción dada — no inventes detalles que la imagen no muestra.`)
  }

  return parts.join('\n')
}
