'use client'

/**
 * Ecualizador de notas (bloque `simulator`, spec del panel §16.2).
 * Una fila por nota: el grosor de la franja es su peso, el deslizador su valor.
 * El resultado se ve al instante, en verde o rojo según llegue a la nota para
 * aprobar. Andamiaje implícito (PhET, §15.1 punto 3): abre con un caso cargado,
 * una sola cosa que llama la atención (el número) y un «Reiniciar» visible.
 *
 * En /learn el estado vive en el contexto del material y viaja a Sophia con cada
 * mensaje. Fuera de /learn (vista previa del editor) usa estado local.
 * Las filas son horizontales en todos los anchos: el panel mide 280–400 px y
 * así el deslizador es largo y se mueve bien con el dedo.
 *
 * 13 oct 2026, tras la prueba de Walther: el resultado va en dos filas (título
 * y número; juntos no entraban en 340 px), el peso se escribe junto al nombre
 * y hay una línea que explica la franja, los casos van en una sola fila de
 * botones chicos y «Reiniciar» es un enlace, no un botón grande.
 */
import { useRef, useState } from 'react'
import { RotateCcw, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { computeResult, fmt, initialState, presetState, type SimState } from '@/lib/simulator'
import type { SimulatorBlock } from '@/types/lesson'
import { useMaterial } from './material-context'

export function SimulatorBody({ block, large = false }: { block: SimulatorBlock; large?: boolean }) {
  const ctx = useMaterial()
  const [local, setLocal] = useState<SimState>(() => initialState(block))
  const state = ctx.hasProvider ? ctx.simStates[block.id] ?? initialState(block) : local
  const guardar = (s: SimState) => (ctx.hasProvider ? ctx.setSimState(block.id, s) : setLocal(s))
  // Valor al empezar a arrastrar: «último cambio» es de 12 a 0, no de 1 a 0.
  const inicio = useRef<Record<string, number>>({})

  const r = computeResult(block, state.values)
  const maxPeso = Math.max(...block.variables.map((v) => v.weight))
  const aprueba = block.labels?.pass ?? 'aprueba'
  const desaprueba = block.labels?.fail ?? 'desaprueba'

  const mover = (id: string, valor: number) => {
    const from = inicio.current[id] ?? state.values[id]
    guardar({
      values: { ...state.values, [id]: valor },
      own: state.own,
      preset: state.own ? undefined : state.preset,
      lastChange: { variable: id, from, to: valor },
    })
  }

  const reiniciar = () => {
    inicio.current = {}
    guardar(initialState(block))
  }

  return (
    <div className={cn('space-y-2.5 p-3', large && 'text-lg')}>
      <div
        className={cn('rounded-lg px-3 py-2', r.pass ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900')}
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {state.own ? 'Tu nota' : state.preset ? `Nota de ${state.preset}` : 'Nota'}
        </p>
        <p className="mt-0.5 flex items-baseline gap-2">
          <span className={cn('font-bold leading-none tabular-nums', large ? 'text-5xl' : 'text-4xl')}>{fmt(r.shown)}</span>
          <span className="text-sm font-semibold">{r.pass ? aprueba : desaprueba}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>La franja más gruesa pesa más en tu nota.</span>
        <button
          type="button"
          onClick={reiniciar}
          className="inline-flex min-h-8 items-center gap-1 font-semibold text-[#09222d] hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reiniciar
        </button>
      </div>

      <ul className="space-y-1">
        {block.variables.map((v) => {
          const min = v.min ?? block.scale.min
          const max = v.max ?? block.scale.max
          const valor = state.values[v.id] ?? min
          return (
            <li key={v.id} className="grid grid-cols-[4.75rem_1fr_2.25rem] items-center gap-2">
              <span className="text-sm leading-tight">
                <span className="font-bold text-[#09222d]">{v.label}</span>
                <span className="text-gray-600"> · {fmt(v.weight)} %</span>
              </span>
              <span className="relative block">
                {/* Grosor proporcional al peso: el TC se ve más pesado que el CV */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 rounded-full bg-[#fbc50b]/55"
                  style={{ height: `${Math.max(6, (v.weight / maxPeso) * 30)}px` }}
                />
                <input
                  type="range"
                  data-variable={v.id}
                  min={min}
                  max={max}
                  step={v.step ?? 1}
                  value={valor}
                  onPointerDown={() => (inicio.current[v.id] = valor)}
                  onFocus={() => (inicio.current[v.id] = valor)}
                  onChange={(e) => mover(v.id, Number(e.target.value))}
                  aria-label={`${v.label}, pesa ${fmt(v.weight)} %`}
                  aria-valuetext={`${v.label}: ${fmt(valor)}`}
                  className="relative block h-9 w-full cursor-pointer accent-[#09222d]"
                />
              </span>
              <span className="text-right text-base font-bold tabular-nums text-gray-900">{fmt(valor)}</span>
            </li>
          )
        })}
      </ul>

      <div>
        <p className="mb-1.5 text-xs text-gray-600">Caso</p>
        <div role="group" aria-label="Caso" className="flex flex-wrap gap-1.5">
          {block.presets.map((p) => {
            const activo = !state.own && state.preset === p.label
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={activo}
                onClick={() => guardar(presetState(block, p.label))}
                className={cn(
                  'min-h-9 rounded-full border px-3 text-xs font-semibold sm:text-sm',
                  activo ? 'border-[#09222d] bg-[#09222d] text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
                )}
              >
                {p.label}
              </button>
            )
          })}
          {block.allowOwnValues && (
            <button
              type="button"
              aria-pressed={state.own}
              onClick={() => guardar({ values: { ...state.values }, own: true })}
              className={cn(
                'inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed px-3 text-xs font-semibold sm:text-sm',
                state.own ? 'border-[#09222d] bg-[#09222d] text-white' : 'border-gray-400 bg-white text-gray-800 hover:bg-gray-50',
              )}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden /> Mis notas
            </button>
          )}
        </div>
      </div>

      {state.own && (
        <p className="text-xs text-gray-600">Mueve las barras hasta tus notas. Esto queda entre tú y el ecualizador: no se guarda ni lo ve tu instructor.</p>
      )}
    </div>
  )
}
