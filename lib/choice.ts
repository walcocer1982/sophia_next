/**
 * Paso cerrado de una actividad (alternativas): orden por sesión, texto que
 * Sophia presenta y lectura de la respuesta del alumno. Todo en código, sin
 * modelo: es lo que hace confiable la nota de este paso.
 *
 * El orden se mezcla por sesión porque el modelo que escribe lecciones tiende a
 * dejar la correcta siempre en la misma letra; se fija con una semilla
 * (sesión + actividad) para que lo que Sophia mostró y lo que se corrige sea lo
 * mismo en todos los turnos.
 */
import type { ChoiceStep } from '@/types/lesson'

export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const
export const DEFAULT_CHOICE_ATTEMPTS = 2

/** Estado del paso cerrado guardado en ActivityProgress.evidenceData.choice */
export interface ChoiceState {
  /** Posición presentada → índice original de la opción */
  order: number[]
  /** Índices ORIGINALES elegidos, en orden */
  picks: number[]
  /** Ya no se pregunta más: acertó o agotó los intentos */
  resolved: boolean
  correct: boolean
  /** Se le dijo cuál era la correcta (agotó intentos) */
  revealed: boolean
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** Orden determinista de las opciones para una sesión y actividad. */
export function choiceOrder(seed: string, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  let h = hash(seed)
  for (let i = n - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** Letra con la que se presentó la opción de índice original `original`. */
export function letterOf(order: number[], original: number): string {
  const pos = order.indexOf(original)
  return CHOICE_LETTERS[pos] ?? '?'
}

/** Texto exacto que Sophia debe mostrar: enunciado y opciones con letra. */
export function renderChoice(choice: ChoiceStep, order: number[]): string {
  const lines = order.map((orig, pos) => `${CHOICE_LETTERS[pos]}) ${choice.options[orig]}`)
  return `${choice.prompt}\n${lines.join('\n')}`
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Lee qué opción eligió el alumno. Acepta la letra («b», «la B», «opción c»,
 * «B)»), el número de posición («2») o el texto de la opción. Devuelve el
 * índice ORIGINAL, o null si el mensaje no elige nada.
 */
export function parseChoicePick(message: string, choice: ChoiceStep, order: number[]): number | null {
  const t = normalize(message)
  if (!t) return null
  const n = order.length

  // Letra sola o con muletilla: «b», «la b», «opcion b», «creo que la c», «b)»
  const letra = t.match(/(?:^|\b(?:la|el|opcion|alternativa|respuesta|letra|es|creo que la|creo que es la|seria la|marco la|elijo la|elijo)\s+)([a-e])(?:\b|$)/)
  if (letra) {
    const pos = CHOICE_LETTERS.indexOf(letra[1].toUpperCase() as typeof CHOICE_LETTERS[number])
    if (pos >= 0 && pos < n) return order[pos]
  }

  // Texto de la opción: todas las palabras con contenido de UNA opción (y solo una)
  const candidatos = choice.options
    .map((opt, idx) => {
      const palabras = normalize(opt).split(' ').filter((w) => w.length >= 4 || /\d/.test(w))
      if (palabras.length === 0) return null
      const presentes = palabras.filter((w) => t.includes(w)).length
      return presentes / palabras.length >= 0.75 ? idx : null
    })
    .filter((v): v is number => v !== null)
  if (candidatos.length === 1) return candidatos[0]


  // Número de posición solo: «2» (después del texto: si las opciones son
  // números, «3» es el valor 3, no la tercera posición)
  const num = t.match(/^(?:la|el|opcion|alternativa)?\s*([1-5])$/)
  if (num) {
    const pos = Number(num[1]) - 1
    if (pos < n) return order[pos]
  }

  return null
}

/** Estado inicial del paso cerrado para una sesión. */
export function newChoiceState(seed: string, choice: ChoiceStep): ChoiceState {
  return { order: choiceOrder(seed, choice.options.length), picks: [], resolved: false, correct: false, revealed: false }
}

/** Aplica una elección y devuelve el estado nuevo (no muta). */
export function applyPick(state: ChoiceState, choice: ChoiceStep, pick: number): ChoiceState {
  const picks = [...state.picks, pick]
  const correct = pick === choice.answer
  const max = choice.max_attempts ?? DEFAULT_CHOICE_ATTEMPTS
  const agotado = !correct && picks.length >= max
  return { ...state, picks, correct, resolved: correct || agotado, revealed: agotado }
}
