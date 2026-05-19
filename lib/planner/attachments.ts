import type { PlannerAttachment } from '@/types/planner'

/**
 * Procesa adjuntos del planificador (contexto por-turno, NO se persisten).
 * Soporta imágenes y PDF — Claude los lee nativamente como content blocks.
 * Cualquier otro tipo se reporta como nota legible para el modelo.
 */

// Bloque de contenido compatible con anthropic.messages (subset usado aquí).
export type PlannerContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

function isImageType(t: string): t is (typeof IMAGE_TYPES)[number] {
  return (IMAGE_TYPES as readonly string[]).includes(t)
}

/**
 * Convierte los adjuntos en bloques para Claude + notas de texto.
 * Cualquier archivo no soportado se reporta como nota (no rompe el flujo).
 */
export async function processPlannerAttachments(
  attachments: PlannerAttachment[]
): Promise<{ blocks: PlannerContentBlock[]; notes: string[] }> {
  const blocks: PlannerContentBlock[] = []
  const notes: string[] = []

  for (const att of attachments) {
    const { name, mimeType, dataBase64 } = att

    if (isImageType(mimeType)) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: dataBase64 },
      })
      continue
    }

    if (mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: dataBase64 },
      })
      continue
    }

    notes.push(`Adjunto "${name}" ignorado: tipo no soportado (${mimeType}). Solo se aceptan imágenes y PDF.`)
  }

  return { blocks, notes }
}
