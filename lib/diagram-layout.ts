/**
 * Trazado de los diagramas del panel (spec del panel §6.1 y decisión 3: SVG
 * propio, sin Mermaid). Funciones puras: reciben el bloque y un ancho y
 * devuelven cajas y flechas en coordenadas; el componente solo dibuja.
 *
 * Los cuatro trazados están pensados para el panel de 280-400 px:
 * - flow: pasos en columna con flechas (y la etiqueta de la arista si la hay).
 * - cycle: la misma columna más una flecha de retorno al primer paso. Un aro
 *   de cajas no entra legible en 280 px (con 5 pasos las flechas quedaban de
 *   pocos píxeles): se prefirió la columna.
 * - hierarchy: árbol con sangría por nivel, a partir de `parent` (hijo → padre).
 * - timeline: línea vertical con hitos.
 */
import type { DiagramBlock } from '@/types/lesson'

export interface DiagramBox {
  id: string
  n: number
  x: number
  y: number
  w: number
  h: number
  lines: string[]
  noteLines: string[]
}

export interface DiagramArrow {
  /** Trazo SVG (atributo d). */
  d: string
  label?: string
  labelX?: number
  labelY?: number
}

export interface DiagramLayout {
  width: number
  height: number
  boxes: DiagramBox[]
  arrows: DiagramArrow[]
  /** Línea de tiempo: el eje vertical. */
  axis?: { x: number; y1: number; y2: number }
  /** Jerarquía: conectores en codo. */
  connectors: string[]
}

export const FONT = 13
export const NOTE_FONT = 11
const LINE = 17
const NOTE_LINE = 14
const PAD = 8
const GAP = 26

/** Parte un texto en líneas que entran en `ancho` px (estimación por carácter). */
export function wrapText(texto: string, ancho: number, fontSize = FONT): string[] {
  const maxChars = Math.max(6, Math.floor(ancho / (fontSize * 0.56)))
  const palabras = texto.trim().split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const pieza = p.length > maxChars ? p.slice(0, maxChars - 1) + '…' : p
    if (!actual) actual = pieza
    else if ((actual + ' ' + pieza).length <= maxChars) actual += ' ' + pieza
    else {
      lineas.push(actual)
      actual = pieza
    }
  }
  if (actual) lineas.push(actual)
  return lineas.length ? lineas : ['']
}

function caja(id: string, n: number, x: number, y: number, w: number, label: string, note?: string, textInset = 30): DiagramBox {
  const lines = wrapText(label, w - textInset - PAD)
  const noteLines = note ? wrapText(note, w - textInset - PAD, NOTE_FONT) : []
  const h = PAD * 2 + lines.length * LINE + noteLines.length * NOTE_LINE
  return { id, n, x, y, w, h: Math.max(h, 36), lines, noteLines }
}

/** Etiqueta de la arista entre dos nodos (si el bloque la declara). */
function etiqueta(b: DiagramBlock, from: string, to: string) {
  return b.edges?.find((e) => e.from === from && e.to === to)?.label
}

function columna(b: DiagramBlock, width: number, margenDerecho: number): DiagramLayout {
  const w = width - 2 - margenDerecho
  const boxes: DiagramBox[] = []
  const arrows: DiagramArrow[] = []
  let y = 1
  b.nodes.forEach((n, i) => {
    const bx = caja(n.id, i + 1, 1, y, w, n.label, n.note)
    boxes.push(bx)
    y += bx.h
    if (i < b.nodes.length - 1) {
      const cx = 1 + w / 2
      const lab = etiqueta(b, n.id, b.nodes[i + 1].id)
      arrows.push({ d: `M ${cx} ${y + 2} L ${cx} ${y + GAP - 3}`, label: lab, labelX: cx + 8, labelY: y + GAP / 2 + 4 })
      y += GAP
    }
  })
  return { width, height: y + 1, boxes, arrows, connectors: [] }
}

function ciclo(b: DiagramBlock, width: number): DiagramLayout {
  const MARGEN = 30
  const l = columna(b, width, MARGEN)
  if (l.boxes.length >= 2) {
    const ultima = l.boxes[l.boxes.length - 1]
    const primera = l.boxes[0]
    const xd = ultima.x + ultima.w
    const xr = width - 10
    const y1 = ultima.y + ultima.h / 2
    const y0 = primera.y + primera.h / 2
    l.arrows.push({ d: `M ${xd + 2} ${y1} L ${xr} ${y1} L ${xr} ${y0} L ${xd + 6} ${y0}` })
  }
  return l
}

function jerarquia(b: DiagramBlock, width: number): DiagramLayout {
  const padre = b.parent ?? {}
  const ids = new Set(b.nodes.map((n) => n.id))
  const hijos = new Map<string, string[]>()
  const raices: string[] = []
  for (const n of b.nodes) {
    const p = padre[n.id]
    if (p && ids.has(p) && p !== n.id) hijos.set(p, [...(hijos.get(p) ?? []), n.id])
    else raices.push(n.id)
  }
  const SANGRIA = 22
  const boxes: DiagramBox[] = []
  const connectors: string[] = []
  const porId = new Map(b.nodes.map((n) => [n.id, n]))
  let y = 1
  let k = 0
  const visitados = new Set<string>()
  const pintar = (id: string, nivel: number, padreBox?: DiagramBox) => {
    if (visitados.has(id) || nivel > 6) return
    visitados.add(id)
    const n = porId.get(id)!
    const x = 1 + nivel * SANGRIA
    const bx = caja(id, ++k, x, y, width - 2 - nivel * SANGRIA, n.label, n.note)
    boxes.push(bx)
    if (padreBox) {
      const xv = padreBox.x + 10
      connectors.push(`M ${xv} ${padreBox.y + padreBox.h} L ${xv} ${bx.y + 18} L ${bx.x} ${bx.y + 18}`)
    }
    y += bx.h + 10
    for (const h of hijos.get(id) ?? []) pintar(h, nivel + 1, bx)
  }
  for (const r of raices) pintar(r, 0)
  // Nodos en un ciclo de padres (dato mal cargado): se muestran al final, sin sangría.
  for (const n of b.nodes) if (!visitados.has(n.id)) pintar(n.id, 0)
  return { width, height: Math.max(y - 9, 2), boxes, arrows: [], connectors }
}

function lineaDeTiempo(b: DiagramBlock, width: number): DiagramLayout {
  const EJE = 14
  const boxes: DiagramBox[] = []
  let y = 4
  b.nodes.forEach((n, i) => {
    const bx = caja(n.id, i + 1, EJE + 16, y, width - EJE - 18, n.label, n.note, 8)
    boxes.push(bx)
    y += bx.h + 12
  })
  const primera = boxes[0]
  const ultima = boxes[boxes.length - 1]
  return {
    width,
    height: y - 8,
    boxes,
    arrows: [],
    connectors: [],
    axis: primera ? { x: EJE, y1: primera.y + 18, y2: ultima.y + 18 } : undefined,
  }
}

export function layoutDiagram(b: DiagramBlock, width = 300): DiagramLayout {
  switch (b.kind) {
    case 'cycle':
      return ciclo(b, width)
    case 'hierarchy':
      return jerarquia(b, width)
    case 'timeline':
      return lineaDeTiempo(b, width)
    case 'flow':
    default:
      return columna(b, width, 0)
  }
}
