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

  return (
    <div className={cn('space-y-3 p-3.5', large && 'text-lg')}>
      <div
        className={cn(
          'flex items-baseline justify-between rounded-lg px-3 py-2',
          r.pass ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900',
        )}
        aria-live="polite"
      >
        <span className="text-sm font-semibold">
          {state.own ? 'Tu nota' : state.preset ? `Nota de ${state.preset}` : 'Nota'}
        </span>
        <span className="flex items-baseline gap-2">
          {r.raw !== r.shown && <span className="text-xs opacity-70">{fmt(r.raw)} →</span>}
          <span className={cn('font-bold tabular-nums', large ? 'text-5xl' : 'text-4xl')}>{fmt(r.shown)}</span>
          <span className="text-sm font-semibold">{r.pass ? aprueba : desaprueba}</span>
        </span>
      </div>

      <ul className="space-y-2.5">
        {block.variables.map((v) => {
          const min = v.min ?? block.scale.min
          const max = v.max ?? block.scale.max
          const valor = state.values[v.id] ?? min
          return (
            <li key={v.id} className="grid grid-cols-[3.25rem_1fr_2.25rem] items-center gap-2">
              <span className="leading-tight">
                <span className="block text-sm font-bold text-[#09222d]">{v.label}</span>
                <span className="block text-[11px] text-gray-600">{fmt(v.weight)} %</span>
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
                  className="relative block h-11 w-full cursor-pointer accent-[#09222d]"
                />
              </span>
              <span className="text-right text-base font-bold tabular-nums text-gray-900">{fmt(valor)}</span>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        {block.presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => guardar(presetState(block, p.label))}
            className={cn(
              'min-h-11 rounded-full border px-3 text-sm',
              !state.own && state.preset === p.label ? 'border-[#09222d] bg-[#09222d] text-white' : 'border-gray-300 bg-white hover:bg-gray-50',
            )}
          >
            {p.label}
          </button>
        ))}
        {block.allowOwnValues && (
          <button
            type="button"
            onClick={() => guardar({ values: { ...state.values }, own: true })}
            className={cn(
              'min-h-11 inline-flex items-center gap-1.5 rounded-full border px-3 text-sm',
              state.own ? 'border-[#09222d] bg-[#09222d] text-white' : 'border-gray-300 bg-white hover:bg-gray-50',
            )}
          >
            <UserRound className="h-4 w-4" aria-hidden /> Mis notas
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            inicio.current = {}
            guardar(initialState(block))
          }}
          className="min-h-11 ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Reiniciar
        </button>
      </div>

      {state.own && (
        <p className="text-xs text-gray-600">Mueve las barras hasta tus notas. Esto queda entre tú y el ecualizador: no se guarda ni lo ve tu instructor.</p>
      )}
    </div>
  )
}
