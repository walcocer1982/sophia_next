'use client'

/**
 * Señalamientos sobre una foto: clic coloca un punto numerado, arrastrar lo
 * mueve. Las coordenadas se guardan en porcentaje, así el punto cae en el mismo
 * lugar con cualquier ancho del panel. Spec §9.1 y decisión 10 (§11).
 */
import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ImageBlock, ImageMarker, ShowWhen } from '@/types/lesson'

const MAX = 8

const SHOW_WHEN_MARKER: { value: ShowWhen | ''; label: string }[] = [
  { value: '', label: 'Por defecto' },
  { value: 'on_start', label: 'Visible desde el inicio' },
  { value: 'on_reference', label: 'Cuando Sophia lo cite' },
]

export function MarkerEditor({ block, onChange }: { block: ImageBlock; onChange: (markers: ImageMarker[]) => void }) {
  const markers = block.markers ?? []
  const caja = useRef<HTMLDivElement>(null)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const movio = useRef(false)

  const posicion = (e: { clientX: number; clientY: number }) => {
    const r = caja.current!.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100))
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  }

  const siguienteN = () => {
    for (let n = 1; n <= 9; n++) if (!markers.some((m) => m.n === n)) return n
    return null
  }

  const agregar = (e: React.MouseEvent) => {
    if (movio.current) {
      movio.current = false
      return
    }
    if (markers.length >= MAX) return
    const n = siguienteN()
    if (!n) return
    onChange([...markers, { n, ...posicion(e), label: '' }].sort((a, b) => a.n - b.n))
  }

  const actualizar = (n: number, cambios: Partial<ImageMarker>) =>
    onChange(markers.map((m) => (m.n === n ? { ...m, ...cambios } : m)))

  const porDefecto = block.kind === 'scene' ? 'aparece cuando Sophia lo cite' : 'visible desde el inicio'

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Haz clic sobre la foto para poner un punto ({markers.length} de {MAX}). Arrástralo para moverlo.
        {block.kind === 'scene' && ' En una escena, el punto que muestra el peligro debe aparecer cuando Sophia lo cite, después de que el alumno responda.'}
      </p>
      <div
        ref={caja}
        onClick={agregar}
        onPointerMove={(e) => {
          if (arrastrando === null) return
          movio.current = true
          actualizar(arrastrando, posicion(e))
        }}
        onPointerUp={() => setArrastrando(null)}
        onPointerLeave={() => setArrastrando(null)}
        className="relative cursor-crosshair select-none overflow-hidden rounded-lg bg-gray-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.description} draggable={false} className="block w-full h-auto" />
        {markers.map((m) => (
          <button
            key={m.n}
            type="button"
            aria-label={`Señalamiento ${m.n}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.currentTarget.setPointerCapture(e.pointerId)
              setArrastrando(m.n)
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-[3px] border-white bg-[#fbc50b] text-sm font-bold text-[#09222d] shadow-md active:cursor-grabbing"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            {m.n}
          </button>
        ))}
      </div>
      {markers.length > 0 && (
        <ol className="space-y-2">
          {markers.map((m) => (
            <li key={m.n} className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbc50b] text-xs font-bold text-[#09222d]">{m.n}</span>
              <input
                value={m.label}
                onChange={(e) => actualizar(m.n, { label: e.target.value })}
                placeholder="Qué señala (lo ve el alumno cuando aparece)"
                maxLength={120}
                className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
              />
              <select
                value={m.showWhen ?? ''}
                onChange={(e) => actualizar(m.n, { showWhen: (e.target.value || undefined) as ShowWhen | undefined })}
                className="rounded border px-2 py-1.5 text-sm"
                title={`Por defecto: ${porDefecto}`}
              >
                {SHOW_WHEN_MARKER.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value === '' ? `Por defecto (${porDefecto})` : o.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onChange(markers.filter((x) => x.n !== m.n))} aria-label={`Quitar señalamiento ${m.n}`} className="rounded p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
