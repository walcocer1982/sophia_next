'use client'

/**
 * Dibuja un bloque `diagram` como SVG a partir del trazado de lib/diagram-layout.ts.
 * Escala al ancho del contenedor (viewBox), así sirve igual en el panel y en
 * la vista ampliada. Spec del panel §6.1, decisión 3.
 */
import { useId } from 'react'
import { FONT, NOTE_FONT, layoutDiagram } from '@/lib/diagram-layout'
import type { DiagramBlock } from '@/types/lesson'

const AZUL = '#09222d'
const AMARILLO = '#fbc50b'

export function DiagramSvg({ block, width = 300 }: { block: DiagramBlock; width?: number }) {
  const uid = useId().replace(/:/g, '')
  const l = layoutDiagram(block, width)
  const esLinea = block.kind === 'timeline'
  const flecha = `flecha-${uid}`

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${l.width} ${l.height}`}
        width="100%"
        role="img"
        aria-labelledby={`t-${uid}`}
        className="block h-auto"
      >
        <title id={`t-${uid}`}>{block.title}</title>
        <defs>
          <marker id={flecha} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
          </marker>
        </defs>

        {l.axis && <line x1={l.axis.x} y1={l.axis.y1} x2={l.axis.x} y2={l.axis.y2} stroke={AZUL} strokeWidth={2} />}
        {l.connectors.map((d, i) => (
          <path key={`c${i}`} d={d} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
        ))}
        {l.arrows.map((a, i) => (
          <g key={`a${i}`}>
            <path d={a.d} fill="none" stroke="#4b5563" strokeWidth={1.5} markerEnd={`url(#${flecha})`} />
            {a.label && (
              <text x={a.labelX} y={a.labelY} fontSize={NOTE_FONT} fill="#4b5563">
                {a.label}
              </text>
            )}
          </g>
        ))}

        {l.boxes.map((b) => (
          <g key={b.id}>
            {esLinea ? (
              <>
                <circle cx={l.axis!.x} cy={b.y + 18} r={10} fill={AMARILLO} stroke={AZUL} strokeWidth={2} />
                <text x={l.axis!.x} y={b.y + 22} fontSize={11} fontWeight={700} fill={AZUL} textAnchor="middle">
                  {b.n}
                </text>
              </>
            ) : (
              <>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="#fff" stroke={AZUL} strokeWidth={1.5} />
                <circle cx={b.x + 16} cy={b.y + 18} r={10} fill={AZUL} />
                <text x={b.x + 16} y={b.y + 22} fontSize={11} fontWeight={700} fill={AMARILLO} textAnchor="middle">
                  {b.n}
                </text>
              </>
            )}
            <text x={esLinea ? b.x : b.x + 32} y={b.y + 8 + FONT} fontSize={FONT} fill="#111827">
              {b.lines.map((ln, i) => (
                <tspan key={i} x={esLinea ? b.x : b.x + 32} dy={i === 0 ? 0 : 17}>
                  {ln}
                </tspan>
              ))}
            </text>
            {b.noteLines.length > 0 && (
              <text x={esLinea ? b.x : b.x + 32} y={b.y + 8 + FONT + b.lines.length * 17} fontSize={NOTE_FONT} fill="#4b5563">
                {b.noteLines.map((ln, i) => (
                  <tspan key={i} x={esLinea ? b.x : b.x + 32} dy={i === 0 ? 0 : 14}>
                    {ln}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        ))}
      </svg>
      {block.kind === 'cycle' && <figcaption className="mt-1 text-xs text-gray-600">↺ Después del último paso se vuelve al primero</figcaption>}
    </figure>
  )
}
