/**
 * Ecualizador de notas (bloque `simulator`, spec del panel §16.2–16.3).
 * Cálculo, estado que manda el navegador y cómo se le describe a Sophia.
 * Funciones puras: las usan el panel, la ruta del chat y las pruebas.
 */
import type { SimulatorBlock } from '@/types/lesson'

export interface SimState {
  values: Record<string, number>
  /** Notas escritas por el alumno («Mis notas»): no se guardan (decisión 14). */
  own?: boolean
  /** Caso cargado («Ana»), si los valores salen de uno. */
  preset?: string
  /** Último movimiento, para que Sophia sepa qué hizo el alumno. */
  lastChange?: { variable: string; from: number; to: number }
}

/** Estado de todos los ecualizadores de la lección, por id de bloque. */
export type MaterialState = Record<string, SimState>

const rango = (b: SimulatorBlock, v: SimulatorBlock['variables'][number]) => ({
  min: v.min ?? b.scale.min,
  max: v.max ?? b.scale.max,
  step: v.step ?? 1,
})

/** Valores con los que abre: el primer caso, o el mínimo de cada barra. */
export function initialState(b: SimulatorBlock): SimState {
  const caso = b.presets[0]
  const values: Record<string, number> = {}
  for (const v of b.variables) values[v.id] = caso?.values[v.id] ?? rango(b, v).min
  return { values, preset: caso?.label }
}

export function presetState(b: SimulatorBlock, label: string): SimState {
  const caso = b.presets.find((p) => p.label === label)
  const values: Record<string, number> = {}
  for (const v of b.variables) values[v.id] = caso?.values[v.id] ?? rango(b, v).min
  return { values, preset: caso?.label }
}

/** Suma ponderada, redondeada según la escala. `shown` es lo que ve el alumno. */
export function computeResult(b: SimulatorBlock, values: Record<string, number>) {
  const raw = b.variables.reduce((s, v) => s + (values[v.id] ?? 0) * (v.weight / 100), 0)
  const shown = b.scale.round === 'half_up' ? Math.floor(raw + 0.5 + 1e-9) : Math.round(raw * 10) / 10
  return { raw: Math.round(raw * 100) / 100, shown, pass: shown >= b.scale.pass }
}

/** «13,65» con coma decimal; enteros sin decimales. */
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace('.', ',')
}

/**
 * Valida el estado que manda el navegador contra el bloque: solo variables
 * conocidas, números dentro del rango. Lo que no cuadra se descarta (el cliente
 * no es fuente de verdad para lo que se le dice a Sophia).
 */
export function sanitizeState(b: SimulatorBlock, crudo: unknown): SimState | null {
  if (!crudo || typeof crudo !== 'object') return null
  const c = crudo as { values?: unknown; own?: unknown; preset?: unknown; lastChange?: unknown }
  if (!c.values || typeof c.values !== 'object') return null
  const values: Record<string, number> = {}
  for (const v of b.variables) {
    const n = Number((c.values as Record<string, unknown>)[v.id])
    if (!Number.isFinite(n)) return null
    const r = rango(b, v)
    values[v.id] = Math.min(r.max, Math.max(r.min, n))
  }
  const estado: SimState = { values, own: c.own === true }
  if (typeof c.preset === 'string' && b.presets.some((p) => p.label === c.preset)) estado.preset = c.preset
  const lc = c.lastChange as { variable?: unknown; from?: unknown; to?: unknown } | undefined
  if (lc && typeof lc.variable === 'string' && b.variables.some((v) => v.id === lc.variable)) {
    const from = Number(lc.from)
    const to = Number(lc.to)
    if (Number.isFinite(from) && Number.isFinite(to)) estado.lastChange = { variable: lc.variable, from, to }
  }
  return estado
}

/** Lo que Sophia lee del ecualizador en este turno («ESTADO DEL PANEL»). */
export function describeStateForPrompt(b: SimulatorBlock, s: SimState): string {
  const { shown, pass } = computeResult(b, s.values)
  const etiqueta = (id: string) => b.variables.find((v) => v.id === id)?.label ?? id
  const valores = b.variables.map((v) => `${v.label} ${fmt(s.values[v.id])}`).join(', ')
  const estado = pass ? b.labels?.pass ?? 'aprueba' : b.labels?.fail ?? 'desaprueba'
  const origen = s.own ? 'notas propias del alumno' : s.preset ? `caso ${s.preset}` : 'valores movidos por el alumno'
  const cambio = s.lastChange
    ? ` Último cambio del alumno: ${etiqueta(s.lastChange.variable)} de ${fmt(s.lastChange.from)} a ${fmt(s.lastChange.to)}.`
    : ''
  const privado = s.own
    ? ' Son notas PROPIAS del alumno: no repitas esos números en el chat; habla de «tu nota más baja» o «la que más pesa».'
    : ''
  return `Ecualizador «${b.title}» (${origen}): ${valores} → resultado ${fmt(shown)} (${estado}).${cambio}${privado}`
}

/**
 * Si el alumno ya movió el ecualizador, la instrucción que va ARRIBA del
 * estado. Prueba del 14 oct 2026: el alumno bajó el TC2 a 0, vio 10 y lo
 * dijo; Sophia siguió el guion («baja el TC2 y dime qué ves») y le dijo que
 * la nota «está en 13». El estado le había llegado; lo ignoró por el guion.
 */
export function directivaSiYaMovio(b: SimulatorBlock, s: SimState): string | null {
  const inicial = initialState(b)
  const cambioDeCaso = !!s.preset && s.preset !== inicial.preset
  const movio = !!s.lastChange || s.own || cambioDeCaso || b.variables.some((v) => s.values[v.id] !== inicial.values[v.id])
  if (!movio) return null
  const { shown, pass } = computeResult(b, s.values)
  const estado = pass ? b.labels?.pass ?? 'aprueba' : b.labels?.fail ?? 'desaprueba'
  const etiqueta = (id: string) => b.variables.find((v) => v.id === id)?.label ?? id
  const que = s.lastChange
    ? `movió ${etiqueta(s.lastChange.variable)} de ${fmt(s.lastChange.from)} a ${fmt(s.lastChange.to)}`
    : s.own
      ? 'cargó sus propias notas'
      : cambioDeCaso
        ? `cargó el caso «${s.preset}»`
        : 'cambió los valores'
  return `EL ESTUDIANTE YA ${que.toUpperCase()} en el ecualizador «${b.title}» y ahora ve ${fmt(shown)} (${estado}). NO le pidas que haga ese cambio ni le digas que la nota «está en» el valor del caso: reacciona al ${fmt(shown)} que tiene delante y pasa al siguiente paso (el contraste o el porqué).`
}

/** Lo que Sophia sabe del bloque (sin estado): variables, pesos y casos. */
export function serializeSimulatorForPrompt(b: SimulatorBlock): string {
  const vars = b.variables.map((v) => `${v.label} ${fmt(v.weight)} %`).join(', ')
  const casos = b.presets
    .map((p) => {
      const r = computeResult(b, p.values)
      return `${p.label}: ${b.variables.map((v) => `${v.label} ${fmt(p.values[v.id] ?? 0)}`).join(', ')} → ${fmt(r.shown)}`
    })
    .join(' | ')
  return `Ecualizador: el estudiante mueve una barra por nota y ve el resultado al instante. Pesos: ${vars}. Escala ${b.scale.min}–${b.scale.max}, aprueba con ${b.scale.pass}.${casos ? ` Casos: ${casos}.` : ''}${b.allowOwnValues ? ' Puede cargar sus propias notas («Mis notas»).' : ''} Guion: predicción → acción («baja el TC2 a 0 y cuéntame qué pasó») → contraste → porqué. Antes de pedir una acción MIRA el ESTADO DEL ECUALIZADOR: si el estudiante ya la hizo, no la pidas; reacciona al resultado que ve. No digas el resultado antes de que mueva: él lo lee en la pizarra.`
}
