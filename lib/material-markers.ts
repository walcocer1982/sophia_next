/**
 * Marcadores con los que Sophia muestra material del panel.
 *
 *   [[block:ID]]     muestra un bloque `on_reference` (u `on_demand`)
 *   [[marker:ID:n]]  muestra el señalamiento n de la imagen ID
 *
 * El marcador queda en el mensaje guardado (así el estado se reconstruye al
 * recargar) y nunca se muestra ni se lee en voz alta: `stripMarkers` lo quita.
 * El servidor filtra los inválidos antes de enviarlos (`createMarkerFilter`).
 * Sin dependencias: lo usan la ruta del chat, la bienvenida y el navegador.
 * Spec: investigacion/panel-de-apoyo-especificacion.md §6.2, §6.6, §10.
 */

export type MarkerKind = 'block' | 'marker'

const MARKER_RE = /\[\[(block|marker):([a-z0-9][a-z0-9-]*)(?::(\d))?\]\]/g
/** Un marcador a medio llegar al final del texto (streaming): «[[blo», «[[marker:esc». */
const PARTIAL_RE = /\[\[?(?:b(?:l(?:o(?:c(?:k(?::[a-z0-9-]*)?)?)?)?)?|m(?:a(?:r(?:k(?:e(?:r(?::[a-z0-9-]*(?::\d?)?)?)?)?)?)?)?)?$/

/** Quita los marcadores (completos y el parcial del final) y los espacios que dejan. */
export function stripMarkers(text: string): string {
  return text
    .replace(MARKER_RE, '')
    .replace(PARTIAL_RE, '')
    // Un id de bloque suelto entre corchetes («[formula-nota]»): Sophia lo copió
    // del prompt una vez. Los ids llevan guion; el texto normal casi nunca.
    .replace(/\[[a-z0-9]+(?:-[a-z0-9]+)+\]/g, '')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
}

export interface Cited {
  blocks: Set<string>
  /** «ID:n» */
  markers: Set<string>
}

/** Bloques y señalamientos citados en uno o varios textos. */
export function citedFromTexts(texts: string[]): Cited {
  const blocks = new Set<string>()
  const markers = new Set<string>()
  for (const t of texts) {
    for (const m of t.matchAll(MARKER_RE)) {
      if (m[1] === 'block') blocks.add(m[2])
      else if (m[3]) markers.add(`${m[2]}:${m[3]}`)
    }
  }
  return { blocks, markers }
}

/**
 * Bloques citados en un texto, en orden y sin repetir (para las tarjetas del
 * chat y para mantenerlos en el panel). Un señalamiento [[marker:ID:n]] cuenta
 * como cita de su imagen: si Sophia marca el punto 3 y en el mismo mensaje
 * pasa a la actividad siguiente, la escena tiene que seguir a la vista.
 */
export function citedBlocksInOrder(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(MARKER_RE)) {
    if (!out.includes(m[2])) out.push(m[2])
  }
  return out
}

export type MarkerCheck = (kind: MarkerKind, id: string, n?: number) => boolean

/** Filtra un texto completo: deja los marcadores válidos y quita los inválidos. */
export function filterMarkersInText(text: string, isAllowed: MarkerCheck): string {
  return text.replace(MARKER_RE, (full, kind: MarkerKind, id: string, n?: string) =>
    isAllowed(kind, id, n ? Number(n) : undefined) ? full : '',
  )
}

/**
 * Filtro para streaming: recibe trozos, devuelve lo que ya se puede enviar.
 * Retiene un posible marcador partido entre trozos hasta saber si es válido.
 */
export function createMarkerFilter(isAllowed: MarkerCheck) {
  let pending = ''
  return {
    push(chunk: string): string {
      pending += chunk
      const corte = pending.lastIndexOf('[[')
      // Si hay un «[[» sin cerrar al final, retenerlo (máx. 40 caracteres: un
      // marcador real es corto; más largo no es marcador y se suelta).
      if (corte >= 0 && !pending.slice(corte).includes(']]') && pending.length - corte <= 40) {
        const listo = pending.slice(0, corte)
        pending = pending.slice(corte)
        return filterMarkersInText(listo, isAllowed)
      }
      const listo = pending
      pending = ''
      return filterMarkersInText(listo, isAllowed)
    },
    flush(): string {
      const resto = pending
      pending = ''
      return filterMarkersInText(resto, isAllowed).replace(PARTIAL_RE, '')
    },
  }
}

export interface ChoiceOption {
  letter: string
  text: string
}

const OPCION_RE = /^\s*(?:\*\*)?([A-E])\)(?:\*\*)?\s+(.+?)\s*$/

/**
 * Separa las alternativas «A) … B) …» del final de un mensaje de Sophia para
 * dibujarlas como botones. Exige al menos dos líneas seguidas, en orden desde
 * la A, al final del mensaje (tolera una pregunta corta después: «¿Cuál es?»).
 */
export function splitChoiceOptions(text: string): { body: string; options: ChoiceOption[]; tail: string } {
  const lines = text.split('\n')
  let end = lines.length - 1
  while (end >= 0 && !lines[end].trim()) end--
  let tailStart = end + 1
  // Una línea final que no es opción y es corta («¿Cuál es tu respuesta?»)
  if (end >= 0 && !OPCION_RE.test(lines[end]) && lines[end].trim().length <= 80) {
    tailStart = end
    end--
    while (end >= 0 && !lines[end].trim()) end--
  }
  let start = end
  while (start >= 0 && OPCION_RE.test(lines[start])) start--
  start++
  const opts = lines.slice(start, end + 1).map((l) => {
    const m = l.match(OPCION_RE)!
    return { letter: m[1], text: m[2].replace(/\*\*/g, '') }
  })
  const enOrden = opts.length >= 2 && opts.every((o, i) => o.letter === 'ABCDE'[i])
  if (!enOrden) return { body: text, options: [], tail: '' }
  return {
    body: lines.slice(0, start).join('\n').trimEnd(),
    options: opts,
    tail: lines.slice(tailStart).join('\n').trim(),
  }
}
