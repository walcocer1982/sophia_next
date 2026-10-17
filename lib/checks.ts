/**
 * Comprobación de cierre (spec del panel §16.1, decisión 15): 2 a 4 preguntas
 * cerradas antes de la reflexión final. Las corrige y las responde el código,
 * sin modelo: «Correcto» o «No: era B) …», sin explicación. Cuenta poco en la
 * nota (una fila de peso 1) y no puede hundir la de la lección.
 */
import { choiceOrder, letterOf, parseChoicePick, renderChoice } from '@/lib/choice'
import type { ChoiceStep } from '@/types/lesson'

export interface ChecksState {
  /** Orden mezclado de las opciones de cada pregunta (índices originales). */
  orders: number[][]
  /** Opción elegida por pregunta (índice original), o null si no llegó. */
  picks: (number | null)[]
  /** Pregunta vigente. */
  index: number
  correct: number
  done: boolean
}

export type CheckTurn =
  | { kind: 'no_pick'; index: number }
  | { kind: 'answered'; index: number; correct: boolean; done: boolean }

export function newChecksState(seed: string, activityId: string, checks: ChoiceStep[]): ChecksState {
  return {
    orders: checks.map((c, i) => choiceOrder(`${seed}:${activityId}:check${i}`, c.options.length)),
    picks: checks.map(() => null),
    index: 0,
    correct: 0,
    done: false,
  }
}

/** La pregunta i, con su número y sus opciones una por línea (el chat las dibuja como botones). */
export function renderCheck(checks: ChoiceStep[], state: ChecksState, i = state.index): string {
  const c = checks[i]
  return renderChoice({ ...c, prompt: `Pregunta ${i + 1} de ${checks.length}: ${c.prompt}` }, state.orders[i])
}

/** Lo que se agrega al mensaje de transición cuando el cierre tiene comprobación. */
export function checksIntro(checks: ChoiceStep[], state: ChecksState): string {
  return `Antes de cerrar, ${checks.length} preguntas rápidas. Elige una letra en cada una.\n\n${renderCheck(checks, state, 0)}`
}

/** Lee la respuesta del alumno a la pregunta vigente. */
export function readCheck(message: string, checks: ChoiceStep[], state: ChecksState): { state: ChecksState; turn: CheckTurn } {
  const i = state.index
  const pick = parseChoicePick(message, checks[i], state.orders[i])
  if (pick === null) return { state, turn: { kind: 'no_pick', index: i } }
  const correct = pick === checks[i].answer
  const picks = [...state.picks]
  picks[i] = pick
  const done = i + 1 >= checks.length
  const nuevo: ChecksState = {
    ...state,
    picks,
    index: done ? i : i + 1,
    correct: state.correct + (correct ? 1 : 0),
    done,
  }
  return { state: nuevo, turn: { kind: 'answered', index: i, correct, done } }
}

/**
 * Respuesta completa del turno, escrita por el código. Al terminar la última
 * pregunta da el resultado y plantea la reflexión de cierre (`reflexion`).
 */
export function checkReply(checks: ChoiceStep[], state: ChecksState, turn: CheckTurn, reflexion: string): string {
  if (turn.kind === 'no_pick') {
    return `Elige una letra, por favor.\n\n${renderCheck(checks, state, turn.index)}`
  }
  const c = checks[turn.index]
  const order = state.orders[turn.index]
  const feedback = turn.correct ? 'Correcto.' : `No: era ${letterOf(order, c.answer)}) ${c.options[c.answer]}.`
  if (!turn.done) return `${feedback}\n\n${renderCheck(checks, state, state.index)}`
  return `${feedback}\n\nAcertaste ${state.correct} de ${checks.length}. Ahora, para cerrar: ${reflexion}`
}

/** Nota de la comprobación (0–100) si terminó. */
export function checksScore(state: ChecksState | undefined | null, total: number): number | null {
  if (!state?.done || total === 0) return null
  return Math.round((state.correct / total) * 100)
}
