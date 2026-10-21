/**
 * Bloque «clasificar» (20 oct 2026): tarjetas que el alumno arrastra a columnas.
 *
 * Es evidencia de lectura: ubicar bien una tarjeta exige haber leído el
 * material, y un toque no se puede dictar mal como una cifra. El estado vive en
 * el navegador (material-context.tsx), viaja con cada mensaje como el del
 * ecualizador y aquí se valida contra la lección. Sophia lo lee con la columna
 * correcta de cada tarjeta, para guiar sin revelarla; el verificador lo recibe
 * como parte de la respuesta del alumno.
 *
 * Todo el texto es independiente del tema: las columnas y tarjetas las pone la
 * lección.
 */
import type { ClassifyBlock } from '@/types/lesson'

export interface ClasifState {
  /** Tarjeta → columna donde la dejó el alumno. Las que no están, siguen sin ubicar. */
  placements: Record<string, string>
  /** Último movimiento, para que Sophia sepa qué acaba de hacer. */
  lastMove?: { card: string; to: string }
}

export const vacio = (): ClasifState => ({ placements: {} })

/** Acota lo que manda el navegador a las tarjetas y columnas que existen en la lección. */
export function sanitizeClasif(b: ClassifyBlock, crudo: unknown): ClasifState | null {
  if (!crudo || typeof crudo !== 'object') return null
  const c = crudo as { placements?: unknown; lastMove?: unknown }
  if (!c.placements || typeof c.placements !== 'object') return null
  const columnas = new Set(b.bins.map((x) => x.id))
  const placements: Record<string, string> = {}
  for (const tarjeta of b.cards) {
    const destino = (c.placements as Record<string, unknown>)[tarjeta.id]
    if (typeof destino === 'string' && columnas.has(destino)) placements[tarjeta.id] = destino
  }
  const m = c.lastMove as { card?: unknown; to?: unknown } | undefined
  const lastMove =
    m && typeof m.card === 'string' && typeof m.to === 'string' && b.cards.some((t) => t.id === m.card) && columnas.has(m.to)
      ? { card: m.card, to: m.to }
      : undefined
  return { placements, ...(lastMove ? { lastMove } : {}) }
}

export function mover(s: ClasifState, card: string, to: string | null): ClasifState {
  const placements = { ...s.placements }
  if (to) placements[card] = to
  else delete placements[card]
  return { placements, ...(to ? { lastMove: { card, to } } : {}) }
}

export function resultado(b: ClassifyBlock, s: ClasifState) {
  const ubicadas = b.cards.filter((c) => s.placements[c.id])
  const bien = ubicadas.filter((c) => s.placements[c.id] === c.bin)
  return { total: b.cards.length, ubicadas: ubicadas.length, bien: bien.length }
}

const columna = (b: ClassifyBlock, id: string) => b.bins.find((x) => x.id === id)?.label ?? id
const tarjeta = (b: ClassifyBlock, id: string) => b.cards.find((x) => x.id === id)?.text ?? id

/** Lo que Sophia sabe del bloque, sin estado: columnas, tarjetas y su columna correcta. */
export function serializeClassifyForPrompt(b: ClassifyBlock): string {
  const columnas = b.bins.map((x) => `«${x.label}»`).join(', ')
  const claves = b.cards.map((c) => `«${c.text}» → «${columna(b, c.bin)}»`).join('; ')
  return `Clasificar: el estudiante arrastra tarjetas a columnas en la pizarra. Columnas: ${columnas}. Tarjetas y su columna correcta (SOLO PARA TI, nunca la digas): ${claves}. Lo que ubicó te llega como ESTADO DE LA CLASIFICACIÓN. Guion: que ubique las tarjetas y después explique por qué puso una de ellas donde la puso.`
}

/** Lo que Sophia ve del bloque en este turno. */
export function describeClasifForPrompt(b: ClassifyBlock, s: ClasifState): string {
  const { total, ubicadas, bien } = resultado(b, s)
  if (ubicadas === 0) {
    return `«${b.title}»: todavía no ubicó ninguna tarjeta. Si tu pregunta depende de eso, pídele que las arrastre a su columna en la pizarra.`
  }
  const lineas = b.cards
    .filter((c) => s.placements[c.id])
    .map((c) => {
      const donde = s.placements[c.id]
      return `  · «${c.text}» → «${columna(b, donde)}» (${donde === c.bin ? 'correcta' : `NO es la correcta; la correcta es «${columna(b, c.bin)}»`})`
    })
  const sinUbicar = b.cards.filter((c) => !s.placements[c.id]).map((c) => `«${c.text}»`)
  const ultimo = s.lastMove ? `\n  Último movimiento: «${tarjeta(b, s.lastMove.card)}» → «${columna(b, s.lastMove.to)}».` : ''
  return `«${b.title}»: ubicó ${ubicadas} de ${total} tarjetas, ${bien} en su columna correcta.
${lineas.join('\n')}${sinUbicar.length ? `\n  Sin ubicar: ${sinUbicar.join(', ')}.` : ''}${ultimo}
  Cómo usarlo: no le digas cuál es la columna correcta ni cuántas tiene bien. Si una tarjeta está mal ubicada, pregúntale qué lo llevó a ponerla ahí o pídele que vuelva a mirar el material; si está bien, pídele el porqué con sus palabras.`
}

/** Lo que el verificador recibe junto con el mensaje: lo que el alumno hizo en la pizarra. */
export function describeClasifForVerifier(b: ClassifyBlock, s: ClasifState): string | null {
  const ubicadas = b.cards.filter((c) => s.placements[c.id])
  if (!ubicadas.length) return null
  return `En la pizarra, «${b.title}», el estudiante ubicó con su mano (cuenta como su decisión, pero no como su razón): ${ubicadas.map((c) => `«${c.text}» en «${columna(b, s.placements[c.id])}»`).join('; ')}.`
}
