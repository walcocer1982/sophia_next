'use client'

/**
 * Bloque «clasificar» (20 oct 2026): el alumno arrastra cada tarjeta a su
 * columna. Es un espacio de trabajo horizontal: tarjetas arriba, columnas lado a
 * lado debajo, y la columna bajo el puntero se ilumina mientras se arrastra
 * (primera prueba: en vertical y sin esa señal costaba acertar al soltar). En celular también se puede tocar la tarjeta y después la columna
 * (y es la vía accesible con teclado). No muestra si está bien o mal: eso lo
 * conversa Sophia, que recibe el estado con cada mensaje (lib/clasificar.ts).
 *
 * En /learn el estado vive en el contexto del material; fuera (vista previa
 * del editor), en estado local.
 */
import { useState } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mover, resultado, vacio, type ClasifState } from '@/lib/clasificar'
import type { ClassifyBlock } from '@/types/lesson'
import { useMaterial } from './material-context'

const SIN_UBICAR = '__sin'

/** Punto donde se soltó, en coordenadas de la ventana (ratón, dedo o lápiz). */
function puntoDeSoltar(e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
  if ('clientX' in e && typeof e.clientX === 'number') return { x: e.clientX, y: e.clientY }
  const toque = (e as TouchEvent).changedTouches?.[0]
  if (toque) return { x: toque.clientX, y: toque.clientY }
  return { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY }
}

export function ClassifyBody({ block }: { block: ClassifyBlock }) {
  const ctx = useMaterial()
  const [local, setLocal] = useState<ClasifState>(vacio)
  const state = ctx.hasProvider ? ctx.clasifStates[block.id] ?? vacio() : local
  const guardar = (s: ClasifState) => (ctx.hasProvider ? ctx.setClasifState(block.id, s) : setLocal(s))
  const [elegida, setElegida] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [zonaActiva, setZonaActiva] = useState<string | null>(null)

  const ubicar = (card: string, zona: string) => {
    const destino = zona === SIN_UBICAR ? null : zona
    if ((state.placements[card] ?? null) !== destino) guardar(mover(state, card, destino))
    setElegida(null)
  }

  // La zona bajo el puntero (la tarjeta arrastrada está encima: se busca en todas las capas).
  const zonaBajo = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { x, y } = puntoDeSoltar(e, info)
    return (
      document
        .elementsFromPoint(x, y)
        .map((el) => (el as HTMLElement).closest?.('[data-zona]') as HTMLElement | null)
        .find((z) => z?.dataset.bloque === block.id)?.dataset.zona ?? null
    )
  }
  const alArrastrar = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const z = zonaBajo(e, info)
    if (z !== zonaActiva) setZonaActiva(z)
  }
  const soltar = (card: string, e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const z = zonaBajo(e, info) ?? zonaActiva
    setArrastrando(null)
    setZonaActiva(null)
    if (z) ubicar(card, z)
  }

  const tocarZona = (zona: string) => {
    if (elegida) ubicar(elegida, zona)
  }

  const { total, ubicadas } = resultado(block, state)
  const tarjetasEn = (zona: string) =>
    block.cards.filter((c) => (zona === SIN_UBICAR ? !state.placements[c.id] : state.placements[c.id] === zona))

  // Funciones, no componentes: un componente definido aquí se volvería a montar
  // en cada render y el arrastre se cortaría al cambiar el estado.
  const tarjeta = (id: string, text: string) => (
    <motion.button
      key={id}
      type="button"
      layout
      drag
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => setArrastrando(id)}
      onDrag={alArrastrar}
      onDragEnd={(e, info) => soltar(id, e, info)}
      onTap={() => setElegida((v) => (v === id ? null : id))}
      // Tocar una tarjeta solo la elige: no debe contar como tocar la columna que la contiene.
      onClick={(e) => e.stopPropagation()}
      whileDrag={{ scale: 1.04, zIndex: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
      aria-pressed={elegida === id}
      className={cn(
        'relative min-h-11 w-full cursor-grab touch-none select-none rounded-lg border px-3 py-2 text-left text-[13px] leading-snug active:cursor-grabbing',
        elegida === id ? 'border-[#09222d] bg-[#09222d] text-white' : 'border-gray-300 bg-white text-gray-900',
      )}
    >
      {text}
    </motion.button>
  )

  const zona = (id: string, label: string, children: React.ReactNode, horizontal = false) => (
    <div
      key={id}
      data-zona={id}
      data-bloque={block.id}
      role="button"
      tabIndex={elegida ? 0 : -1}
      aria-label={elegida ? `Poner la tarjeta elegida en «${label}»` : label}
      onClick={() => tocarZona(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          tocarZona(id)
        }
      }}
      className={cn(
        'flex flex-col rounded-xl border-2 border-dashed p-2.5 transition-colors',
        zonaActiva === id
          ? 'border-[#09222d] bg-gray-100'
          : arrastrando || elegida
            ? 'border-[#09222d] bg-gray-50'
            : 'border-gray-300',
      )}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p>
      <div className={cn('flex min-h-11 flex-1 gap-2', horizontal ? 'flex-wrap [&>*]:w-auto [&>*]:max-w-full' : 'flex-col')}>{children}</div>
    </div>
  )

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>{block.prompt ?? 'Arrastra cada tarjeta a su columna.'} También puedes tocar la tarjeta y luego la columna.</span>
        <span className="flex items-center gap-3">
          <span className="tabular-nums">{ubicadas} de {total}</span>
          {ubicadas > 0 && (
            <button
              type="button"
              onClick={() => {
                guardar(vacio())
                setElegida(null)
              }}
              className="inline-flex min-h-8 items-center gap-1 font-semibold text-[#09222d] hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reiniciar
            </button>
          )}
        </span>
      </div>

      {zona(SIN_UBICAR, ubicadas === total ? 'Todas ubicadas' : 'Por ubicar', tarjetasEn(SIN_UBICAR).map((c) => tarjeta(c.id, c.text)), true)}

      {/* Columnas lado a lado; en una pizarra angosta bajan a dos o a una. */}
      <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))]">
        {block.bins.map((col) => zona(col.id, col.label, tarjetasEn(col.id).map((c) => tarjeta(c.id, c.text))))}
      </div>
    </div>
  )
}
