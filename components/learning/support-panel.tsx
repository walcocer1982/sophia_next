'use client'

/**
 * Panel derecho de /learn: «Material de apoyo».
 * Muestra los bloques de la actividad actual más los fijados (`pinned`) de
 * actividades anteriores. Reemplaza a ImagePanel; el video de Sophia se
 * eliminó del panel (decisión del 6 oct 2026).
 *
 * Etapa 2: un bloque `on_reference` aparece cuando Sophia lo cita con
 * [[block:ID]]; uno `on_demand`, cuando el alumno lo pide con el botón. En
 * pantallas angostas el panel es un cajón que sube desde abajo.
 * Especificación: investigacion/panel-de-apoyo-especificacion.md §6.
 */
import { useEffect, useMemo } from 'react'
import { ChevronRight, Layers, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isBlockShown, type BlockWithActivity } from '@/lib/support-blocks'
import { SupportBlockCard } from './support-block'
import { useMaterial } from './material-context'

interface SupportPanelProps {
  blocks: BlockWithActivity[]
  /** Ids de las actividades en orden, para saber cuáles quedaron atrás. */
  activityOrder: string[]
  currentActivityId: string | null
  /** Escritorio: plegado a ancho cero. */
  isCollapsed: boolean
  /** Pantallas angostas: cajón abierto. Cerrado, no se muestra. */
  mobileOpen?: boolean
  /** Escritorio: plegar el panel. */
  onToggle: () => void
  /** Pantallas angostas: cerrar el cajón. */
  onCloseMobile?: () => void
  isTest?: boolean
}

export function splitBlocks(blocks: BlockWithActivity[], activityOrder: string[], currentActivityId: string | null) {
  const idx = currentActivityId ? Math.max(0, activityOrder.indexOf(currentActivityId)) : 0
  const actualId = activityOrder[idx]
  const anteriores = new Set(activityOrder.slice(0, idx))
  return {
    pinned: blocks.filter((b) => b.pinned && anteriores.has(b.activityId)),
    current: blocks.filter((b) => b.activityId === actualId),
  }
}

/** Lo que el panel muestra de verdad, según lo que Sophia citó y el alumno abrió. */
export function useShownBlocks(blocks: BlockWithActivity[], activityOrder: string[], currentActivityId: string | null) {
  const { cited, lastCited, opened } = useMaterial()
  return useMemo(() => {
    const { pinned, current } = splitBlocks(blocks, activityOrder, currentActivityId)
    const visto = (b: BlockWithActivity) => isBlockShown(b, cited, opened)
    // Lo que Sophia acaba de citar de otra actividad se queda mientras su
    // mensaje sea el último: si no, la tarjeta «Ver en el panel» no lleva a nada.
    const yaEsta = new Set([...pinned, ...current].map((b) => b.id))
    const recien = blocks.filter((b) => lastCited.includes(b.id) && !yaEsta.has(b.id))
    return {
      pinned: pinned.filter(visto),
      current: [...recien, ...current.filter(visto)],
      onDemand: current.filter((b) => b.showWhen === 'on_demand' && !visto(b)),
    }
  }, [blocks, activityOrder, currentActivityId, cited, lastCited, opened])
}

export function SupportPanel({
  blocks,
  activityOrder,
  currentActivityId,
  isCollapsed,
  mobileOpen = false,
  onToggle,
  onCloseMobile,
  isTest = false,
}: SupportPanelProps) {
  const { focus, openBlock } = useMaterial()
  const { pinned, current, onDemand } = useShownBlocks(blocks, activityOrder, currentActivityId)
  const total = pinned.length + current.length

  // Traer a la vista el bloque que Sophia acaba de citar o que el alumno tocó en el chat.
  useEffect(() => {
    if (!focus) return
    const raf = requestAnimationFrame(() => {
      document.getElementById(`block-${focus.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(raf)
  }, [focus])

  return (
    <>
      {/* Celular: fondo que cierra el cajón al tocarlo. */}
      {mobileOpen && (
        <div aria-hidden className="fixed inset-0 z-30 bg-[#09222d]/40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        aria-label="Material de apoyo"
        className={cn(
          'bg-white flex-col shrink-0',
          // Pantallas angostas: oculto, o cajón inferior a 3/4 del alto.
          mobileOpen
            ? 'flex fixed inset-x-0 bottom-0 z-40 h-[75vh] rounded-t-2xl shadow-2xl'
            : 'hidden',
          // Escritorio: siempre en el flujo, ancho fijo o plegado.
          'lg:static lg:z-auto lg:h-auto lg:rounded-none lg:shadow-none lg:flex lg:border-l lg:border-gray-200 lg:transition-all lg:duration-300',
          isCollapsed ? 'lg:w-0 lg:overflow-hidden lg:border-none' : 'lg:w-[340px] xl:w-[400px]',
        )}
      >
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300 lg:hidden" />
        <div className="px-4 py-2 lg:py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#09222d]">Material de apoyo</h2>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar material"
            className="h-11 w-11 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Ocultar material"
            className="hidden h-11 w-11 rounded-lg text-gray-600 hover:bg-gray-100 items-center justify-center lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {total === 0 && onDemand.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Layers className="h-7 w-7 text-gray-400" aria-hidden />
              </div>
              <p className="text-sm text-gray-600">Aquí aparece el material cuando Sophia lo muestre</p>
            </div>
          ) : (
            <>
              {/* Lo fijado se pliega solo si la actividad trae material propio: si no,
                  el alumno sigue necesitándolo abierto (el manual de LEC-MAN en las
                  actividades 2 a 4). La key incluye la actividad actual para que el
                  plegado se recalcule al avanzar. */}
              {pinned.map((b) => (
                <SupportBlockCard
                  key={`${currentActivityId}:${b.id}`}
                  block={b}
                  pinned
                  startCollapsed={current.length > 0}
                  isTest={isTest}
                />
              ))}
              {current.map((b) => (
                <SupportBlockCard key={`${currentActivityId}:${b.id}`} block={b} isTest={isTest} />
              ))}
              {onDemand.length > 0 && (
                <button
                  type="button"
                  onClick={() => onDemand.forEach((b) => openBlock(b.id))}
                  className="w-full min-h-11 rounded-xl border border-dashed border-gray-400 bg-white px-3 text-sm font-semibold text-[#09222d] flex items-center justify-center gap-1.5 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Ver material disponible ({onDemand.length})
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
