'use client'

/**
 * La Pizarra: el material de apoyo, siempre a la vista. Columna derecha en
 * escritorio; pestaña «Pizarra» en pantallas angostas (learning-layout.tsx).
 *
 * Vuelve el 14 oct 2026 después de probar el material dentro de la hoja: ahí
 * la tabla y el caso aparecían DESPUÉS de la pregunta, se iban con el scroll y
 * alejaban la pregunta de la caja de respuesta. Es el panel derecho de antes
 * (spec del panel §6), en navy y con el nombre que Walther prefiere.
 *
 * Muestra el material de la actividad actual (según lo que Sophia citó y el
 * alumno abrió) y, al final y plegado, lo fijado de actividades anteriores,
 * salvo lo que la actividad declara en `teaching.uses` (pinnedStaysOpen).
 */
import { useEffect, useMemo, useRef } from 'react'
import { Layers, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isBlockShown, pinnedStaysOpen, type ActivityPanelInfo, type BlockWithActivity } from '@/lib/support-blocks'
import { SupportBlockCard } from './support-block'
import { useMaterial } from './material-context'

export function splitBlocks(blocks: BlockWithActivity[], activityOrder: string[], currentActivityId: string | null) {
  const idx = currentActivityId ? Math.max(0, activityOrder.indexOf(currentActivityId)) : 0
  const actualId = activityOrder[idx]
  const anteriores = new Set(activityOrder.slice(0, idx))
  return {
    pinned: blocks.filter((b) => b.pinned && anteriores.has(b.activityId)),
    current: blocks.filter((b) => b.activityId === actualId),
  }
}

/** Lo que la pizarra muestra de verdad, según lo que Sophia citó y el alumno abrió. */
export function useShownBlocks(blocks: BlockWithActivity[], activityOrder: string[], currentActivityId: string | null) {
  const { cited, lastCited, opened } = useMaterial()
  return useMemo(() => {
    const { pinned, current } = splitBlocks(blocks, activityOrder, currentActivityId)
    const visto = (b: BlockWithActivity) => isBlockShown(b, cited, opened)
    // Lo que Sophia acaba de citar de otra actividad se queda mientras su
    // mensaje sea el último: si no, «Ver en la pizarra» no lleva a nada.
    const yaEsta = new Set([...pinned, ...current].map((b) => b.id))
    const recien = blocks.filter((b) => lastCited.includes(b.id) && !yaEsta.has(b.id))
    return {
      pinned: pinned.filter(visto),
      current: [...recien, ...current.filter(visto)],
      onDemand: current.filter((b) => b.showWhen === 'on_demand' && !visto(b)),
    }
  }, [blocks, activityOrder, currentActivityId, cited, lastCited, opened])
}

interface PizarraProps {
  blocks: BlockWithActivity[]
  activityOrder: string[]
  currentActivityId: string | null
  /** Tipo, `uses` y si trae material propio, por actividad: decide qué fijado va abierto. */
  activityInfo?: Record<string, ActivityPanelInfo>
  /** Sesión de prueba vista como instructor: avisa las imágenes sin validar. */
  isTest?: boolean
  className?: string
}

export function Pizarra({ blocks, activityOrder, currentActivityId, activityInfo, isTest = false, className }: PizarraProps) {
  const { focus, openBlock, resetSimState } = useMaterial()
  const { pinned, current, onDemand } = useShownBlocks(blocks, activityOrder, currentActivityId)
  const info = currentActivityId ? activityInfo?.[currentActivityId] : undefined
  const total = pinned.length + current.length

  // Al dejar la actividad que usa un ecualizador, vuelve a su caso inicial
  // (decisión del 13 oct 2026): lo movido ya está en la evidencia, y un «10
  // desaprueba» en rojo no es lo que debe quedar a la vista en el cierre.
  const actividadAnterior = useRef(currentActivityId)
  useEffect(() => {
    if (actividadAnterior.current === currentActivityId) return
    actividadAnterior.current = currentActivityId
    for (const b of splitBlocks(blocks, activityOrder, currentActivityId).pinned) {
      if (b.type === 'simulator' && !pinnedStaysOpen(info, b.id)) resetSimState(b.id)
    }
  }, [currentActivityId, blocks, activityOrder, info, resetSimState])

  // Traer a la vista el bloque que Sophia acaba de citar o que el alumno tocó en el chat.
  useEffect(() => {
    if (!focus) return
    const raf = requestAnimationFrame(() => {
      document.getElementById(`block-${focus.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(raf)
  }, [focus])

  return (
    <aside aria-label="Pizarra" className={cn('flex-col bg-[#0b1a2e] lg:border-l lg:border-white/10', className)}>
      {/* En pantallas angostas el nombre ya está en la pestaña */}
      <div className="hidden lg:flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Layers className="h-4 w-4 text-[#fbc50b]" aria-hidden />
        <h2 className="text-[15px] font-semibold text-white">Pizarra</h2>
        {total > 0 && <span className="text-xs text-[#7f909b]">{total}</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {total === 0 && onDemand.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
              <Layers className="h-7 w-7 text-[#7f909b]" aria-hidden />
            </div>
            <p className="text-sm text-[#a9b8c2]">Aquí aparece el material cuando Sophia lo muestre</p>
          </div>
        ) : (
          /* Cuando la pizarra es ancha (más de ~700 px), las tarjetas van en dos
             columnas: la fórmula y el ecualizador lado a lado, sin desplazarse.
             Con un solo bloque, ocupa todo el ancho. */
          <div className="grid content-start gap-3.5 grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))]">
            {current.map((b) => (
              <SupportBlockCard key={`${currentActivityId}:${b.id}`} block={b} isTest={isTest} />
            ))}
            {onDemand.length > 0 && (
              <button
                type="button"
                onClick={() => onDemand.forEach((b) => openBlock(b.id))}
                className="col-span-full w-full min-h-11 rounded-xl border border-dashed border-white/25 px-3 text-sm font-semibold text-[#e6edf1] flex items-center justify-center gap-1.5 hover:bg-white/5"
              >
                <Plus className="h-4 w-4" aria-hidden /> Ver material disponible ({onDemand.length})
              </button>
            )}
            {pinned.length > 0 && (
              <>
                {current.length > 0 && (
                  <p className="col-span-full pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#7f909b]">De actividades anteriores</p>
                )}
                {pinned.map((b) => (
                  <SupportBlockCard
                    key={`${currentActivityId}:${b.id}`}
                    block={b}
                    pinned
                    startCollapsed={!pinnedStaysOpen(info, b.id)}
                    isTest={isTest}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
