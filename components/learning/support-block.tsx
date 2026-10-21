'use client'

/**
 * Un bloque del material de apoyo (panel derecho de /learn).
 * Siete tipos: imagen, comparación, fórmula, tabla, texto, caso y diagrama.
 * Especificación y lienzos: investigacion/panel-de-apoyo-especificacion.md §6.
 */
import { createContext, useContext, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Columns2,
  FileText,
  GitBranch,
  ImageIcon,
  Pin,
  SlidersHorizontal,
  Columns3,
  Maximize2,
  Sigma,
  Table2,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isMarkerVisible } from '@/lib/support-blocks'
import { useMaterial } from './material-context'
import { DiagramSvg } from './diagram-svg'
import { SimulatorBody } from './simulator-block'
import { ClassifyBody } from './classify-block'
import { alternar, lineasDelTexto, sinSubrayar, textoPlano } from '@/lib/subrayado'
import type {
  CaseBlock,
  CompareBlock,
  DiagramBlock,
  FormulaBlock,
  ImageBlock,
  ImageMarker,
  SupportBlock,
  TableBlock,
  TextBlock,
} from '@/types/lesson'

const ICONO: Record<SupportBlock['type'], typeof ImageIcon> = {
  image: ImageIcon,
  compare: Columns2,
  formula: Sigma,
  table: Table2,
  text: FileText,
  case: UserRound,
  diagram: GitBranch,
  simulator: SlidersHorizontal,
  classify: Columns3,
}

interface SupportBlockCardProps {
  block: SupportBlock
  /** Fijado de una actividad anterior: lleva la marca «Fija». */
  pinned?: boolean
  /** Arranca plegado en una línea (un fijado, cuando la actividad trae su propio material). */
  startCollapsed?: boolean
  /** Sesión de prueba: muestra el aviso de imagen sin validar. */
  isTest?: boolean
}

export function SupportBlockCard({ block, pinned = false, startCollapsed = false, isTest = false }: SupportBlockCardProps) {
  const [abierto, setAbierto] = useState(!startCollapsed)
  const [ampliado, setAmpliado] = useState(false)
  const { focus } = useMaterial()
  const enfocado = focus?.id === block.id
  // Si Sophia lo cita o el alumno lo pide desde el chat, la tarjeta se abre
  // aunque estuviera plegada (ajuste de estado durante el render, sin efecto).
  const [nonceVisto, setNonceVisto] = useState(enfocado ? focus.nonce : 0)
  if (enfocado && focus.nonce !== nonceVisto) {
    setNonceVisto(focus.nonce)
    if (!abierto) setAbierto(true)
  }
  const Icono = ICONO[block.type]
  const ampliable = block.type === 'image' || block.type === 'compare' || block.type === 'text' || block.type === 'table' || block.type === 'diagram' || block.type === 'simulator' || block.type === 'classify'

  return (
    <section
      id={`block-${block.id}`}
      className={cn(
        'scroll-mt-4 rounded-xl border bg-white overflow-hidden transition-shadow',
        enfocado ? 'border-[#fbc50b] ring-2 ring-[#fbc50b]/60' : 'border-gray-200',
      )}
    >
      {/* Encabezado: el título pliega; «Ampliar» es un ícono aparte (antes era un
          botón a todo lo ancho bajo cada bloque y «Fija» un chip que competía
          con el título; 13 oct 2026). */}
      <div className="flex items-stretch bg-gray-50 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="min-w-0 flex-1 min-h-11 flex items-center gap-2 px-3.5 py-2.5 text-left"
        >
          <Icono className="h-4 w-4 shrink-0 text-[#09222d]" aria-hidden />
          <span className="flex-1 text-sm font-semibold text-[#09222d] leading-snug">{block.title}</span>
          {pinned && (
            <span className="shrink-0 text-gray-400" title="De una actividad anterior">
              <Pin className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">De una actividad anterior</span>
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', abierto && 'rotate-180')} aria-hidden />
        </button>
        {ampliable && (
          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar ${block.title}`}
            className="w-11 shrink-0 flex items-center justify-center border-l border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-[#09222d]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {abierto && (
        <div>
          {block.source && block.type !== 'image' && block.type !== 'compare' && (
            <p className="px-3.5 pt-2 text-xs text-gray-600">Fuente: {block.source}</p>
          )}
          <BlockBody block={block} isTest={isTest} />
        </div>
      )}

      {ampliado && <BlockModal block={block} onClose={() => setAmpliado(false)} />}
    </section>
  )
}

function BlockBody({ block, isTest }: { block: SupportBlock; isTest: boolean }) {
  switch (block.type) {
    case 'image':
      return <ImageBody block={block} isTest={isTest} />
    case 'compare':
      return <CompareBody block={block} />
    case 'formula':
      return <FormulaBody block={block} />
    case 'table':
      return <TableBody block={block} />
    case 'text':
      return <TextBody block={block} />
    case 'case':
      return <CaseBody block={block} />
    case 'diagram':
      return <DiagramBody block={block} />
    case 'simulator':
      return <SimulatorBody block={block} />
    case 'classify':
      return <ClassifyBody block={block} />
  }
}

// ── Imagen ──────────────────────────────────────────────────────────────

/**
 * Vista previa del editor (planner): muestra todos los señalamientos, aunque
 * Sophia todavía no los haya citado, para que el instructor vea dónde caen.
 */
const PreviewTodosLosSenalamientos = createContext(false)
export function MarkerPreviewProvider({ children }: { children: React.ReactNode }) {
  return <PreviewTodosLosSenalamientos.Provider value>{children}</PreviewTodosLosSenalamientos.Provider>
}

/** Un señalamiento se dibuja si es `on_start` o si Sophia ya lo citó con [[marker:ID:n]]. */
function useMarkerVisible() {
  const { cited } = useMaterial()
  const todos = useContext(PreviewTodosLosSenalamientos)
  return (m: ImageMarker, block: ImageBlock) => todos || isMarkerVisible(m, block, cited)
}

function Markers({ block, size = 28 }: { block: ImageBlock; size?: number }) {
  const markerVisible = useMarkerVisible()
  return (
    <>
      {/* Un señalamiento oculto NO se dibuja, ni punteado: en la prueba del 6 oct
          el círculo punteado ya apuntaba al protector auditivo antes de que el
          alumno respondiera qué estaba mal en la escena. */}
      {(block.markers ?? [])
        .filter((m) => markerVisible(m, block))
        .map((m) => (
          <span
            key={m.n}
            aria-hidden
            className="absolute flex items-center justify-center rounded-full font-bold text-sm -translate-x-1/2 -translate-y-1/2 bg-[#fbc50b] text-[#09222d] border-[3px] border-white shadow-md"
            style={{ left: `${m.x}%`, top: `${m.y}%`, width: size, height: size }}
          >
            {m.n}
          </span>
        ))}
    </>
  )
}

function MarkerList({ block }: { block: ImageBlock }) {
  const markerVisible = useMarkerVisible()
  if (!block.markers?.length) return null
  return (
    <ol className="px-3.5 pt-3 space-y-2 text-sm">
      {block.markers.map((m) => {
        const visible = markerVisible(m, block)
        return (
          <li key={m.n} className={cn('flex gap-2.5 items-start', !visible && 'text-gray-600')}>
            <span
              className={cn(
                'h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold',
                visible ? 'bg-[#fbc50b] text-[#09222d]' : 'border-2 border-dashed border-gray-400',
              )}
            >
              {m.n}
            </span>
            <span>{visible ? m.label : 'Aparece cuando Sophia lo cite'}</span>
          </li>
        )
      })}
    </ol>
  )
}

function ImageFooter({ block }: { block: ImageBlock }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3.5 pt-2.5 pb-3 text-xs text-gray-600">
      <span>Fuente: {block.source || 'sin registrar'}</span>
      <span aria-hidden>·</span>
      <span>{block.license}</span>
      {block.validated && (
        <span className="ml-auto inline-flex items-center gap-1 font-bold text-green-800">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Validada
        </span>
      )}
    </div>
  )
}

function ImageBody({ block, isTest }: { block: ImageBlock; isTest: boolean }) {
  if (block.kind === 'term') {
    return (
      <div>
        <div className="flex gap-3 px-3.5 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.description} className="h-28 w-28 shrink-0 rounded-lg object-cover" />
          <p className="text-sm leading-relaxed text-gray-800">{block.description}</p>
        </div>
        <ImageFooter block={block} />
      </div>
    )
  }
  return (
    <div>
      {!block.validated && isTest && (
        <p className="mx-3.5 mt-3 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
          Imagen pendiente de validación: los estudiantes no la ven.
        </p>
      )}
      <div className="relative mx-3 mt-3 overflow-hidden rounded-lg bg-[#09222d]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.description} className="block w-full h-auto" />
        <Markers block={block} />
      </div>
      <MarkerList block={block} />
      <ImageFooter block={block} />
    </div>
  )
}

// ── Comparación ─────────────────────────────────────────────────────────

function CompareBody({ block }: { block: CompareBlock }) {
  return (
    <div className="p-3.5">
      <div className={cn('grid gap-2.5', block.items.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {block.items.map((it, i) => (
          <figure key={i} className="m-0 flex flex-col gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={it.description} className="aspect-square w-full rounded-lg object-cover" />
            <figcaption className="text-center text-xs text-gray-600">{it.caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-gray-600">
        Fuente: {block.source || 'sin registrar'} · {block.items[0]?.license}
      </p>
    </div>
  )
}

// ── Fórmula ─────────────────────────────────────────────────────────────

function FormulaBody({ block }: { block: FormulaBlock }) {
  return (
    <div className="p-3.5 space-y-3">
      <p className="rounded-lg bg-gray-100 px-3 py-2.5 text-[15px] leading-relaxed text-gray-900">{block.expression}</p>
      {block.terms && block.terms.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {block.terms.map((t) => (
            <div key={t.symbol} className="flex gap-1">
              <dt className="font-bold">{t.symbol}</dt>
              <dd className="text-gray-700">
                {t.meaning}
                {t.value ? ` · ${t.value}` : ''}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {block.example && (
        <div>
          <p className="text-xs text-gray-600">Ejemplo resuelto: {block.example.label}</p>
          <table className="mt-1 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="border-b border-gray-200 py-1.5 pr-1 font-bold">Evento</th>
                <th className="border-b border-gray-200 py-1.5 pr-1 font-bold">Nota × peso</th>
                <th className="border-b border-gray-200 py-1.5 text-right font-bold">Aporte</th>
              </tr>
            </thead>
            <tbody>
              {block.example.rows.map((r) => (
                <tr key={r.term}>
                  <td className="border-b border-gray-100 py-1.5 pr-1">{r.term}</td>
                  <td className="border-b border-gray-100 py-1.5 pr-1">
                    {r.value} × {r.weight}
                  </td>
                  <td className="border-b border-gray-100 py-1.5 text-right">{r.result}</td>
                </tr>
              ))}
              <tr className="bg-amber-100 font-bold">
                <td className="py-2 pl-1" colSpan={2}>
                  Suma
                </td>
                <td className="py-2 pr-1 text-right">{block.example.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Tabla ───────────────────────────────────────────────────────────────

function TableBody({ block }: { block: TableBlock }) {
  const filas = new Set(block.highlight?.rows ?? [])
  const cols = new Set(block.highlight?.cols ?? [])
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-gray-600">
              {block.columns.map((c, j) => (
                <th key={j} className={cn('border-b border-gray-200 px-3 py-2 text-left font-bold', cols.has(j) && 'bg-amber-50')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className={cn(filas.has(i) && 'bg-amber-100 font-bold')}>
                {r.map((celda, j) => (
                  <td key={j} className={cn('border-b border-gray-100 px-3 py-2', cols.has(j) && !filas.has(i) && 'bg-amber-50')}>
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.legend && <p className="px-3.5 pt-2 pb-3 text-xs text-gray-600">{block.legend}</p>}
    </div>
  )
}

// ── Texto ───────────────────────────────────────────────────────────────

function TextBody({ block, large = false }: { block: TextBlock; large?: boolean }) {
  const { hasProvider } = useMaterial()
  if (block.subrayable && hasProvider) return <TextoSubrayable block={block} large={large} />
  return (
    <div className={cn('px-3.5 py-3 leading-relaxed text-gray-900', large ? 'text-lg' : 'text-[15px]')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          ol: ({ children }) => <ol className="mb-2.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
          ul: ({ children }) => <ul className="mb-2.5 list-disc space-y-0.5 pl-5">{children}</ul>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        }}
      >
        {block.body}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Texto subrayable (lib/subrayado.ts): cada línea es un botón; tocarla la
 * subraya y tocarla otra vez la quita. Lo subrayado viaja a Sophia.
 */
function TextoSubrayable({ block, large = false }: { block: TextBlock; large?: boolean }) {
  const { subrayados, setSubrayado, subrayadosRevisados, pedirRevision } = useMaterial()
  const estado = subrayados[block.id] ?? sinSubrayar()
  const lineas = lineasDelTexto(block.body)
  // Lo revisado por el servidor (21 oct 2026): nunca antes de enviar, para que
  // no se pueda tocar hasta que salga verde.
  const revisado = subrayadosRevisados[block.id]
  // Verde solo lo que respalda: si marcó una de más, esa no se pinta (21 oct 2026: se pintaban las dos).
  const respalda = new Set(revisado?.resultado === 'respalda' ? revisado.respaldan ?? revisado.lineas : revisado?.revelada ?? [])
  const noRespalda = new Set(revisado?.resultado === 'no_respalda' ? revisado.lineas : [])
  // Cada revisión que no respalda hace vibrar la línea: la clave cambia con cada una.
  const vibracion = revisado?.resultado === 'no_respalda' ? revisado.nonce ?? 0 : 0
  // La línea tocada mientras viaja la revisión (medio segundo): gris neutro que
  // parpadea, no amarillo, que se leía como «aceptada» antes de pasar a rojo (21 oct 2026).
  // Se apaga sola cuando llega la revisión (cambia el nonce).
  const [tocada, setTocada] = useState<{ n: number; nonce: number } | null>(null)
  const enRevision = tocada && tocada.nonce === (revisado?.nonce ?? 0) ? tocada.n : null
  return (
    <div className={cn('px-2.5 py-3 leading-relaxed text-gray-900', large ? 'text-lg' : 'text-[15px]')}>
      <p className="mb-2 px-1 text-xs text-gray-600">
        {estado.lineas.length
          ? `${estado.lineas.length} subrayada${estado.lineas.length > 1 ? 's' : ''}.`
          : 'Toca la línea que respalda tu respuesta: se revisa al tocarla.'}
      </p>
      <ul className="space-y-1">
        {lineas.map((linea, n) => {
          const marcada = estado.lineas.includes(n)
          const plana = textoPlano(linea)
          const verde = respalda.has(plana)
          // Roja mientras siga marcada; gris tachada cuando ya se reveló la correcta.
          const roja = !verde && noRespalda.has(plana) && marcada && !revisado?.revelada
          const gris = !verde && noRespalda.has(plana) && marcada && !!revisado?.revelada
          const esItem = /^(\d+[.)]|[-*•])\s+/.test(linea)
          return (
            <li key={roja ? `${n}:${vibracion}` : n} className={cn(roja && vibracion > 0 && 'animate-vibrar')}>
              <button
                type="button"
                aria-pressed={marcada}
                onClick={() => {
                  if (marcada) {
                    setSubrayado(block.id, alternar(estado, n))
                    return
                  }
                  // Si ya respondió, cada toque es una respuesta: se revisa sola esa línea.
                  // Si no, se suma a lo marcado y viaja con la respuesta que escriba.
                  setSubrayado(block.id, { lineas: [n] })
                  if (pedirRevision()) setTocada({ n, nonce: revisado?.nonce ?? 0 })
                  else setSubrayado(block.id, alternar(estado, n))
                }}
                className={cn(
                  'flex w-full gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
                  enRevision === n
                    ? 'animate-pulse bg-gray-100 text-gray-700'
                    : verde
                    ? 'bg-green-50 text-green-900 underline decoration-green-600 decoration-2 underline-offset-4'
                    : roja
                      ? 'bg-red-50 text-red-900 underline decoration-red-500 decoration-2 underline-offset-4'
                      : gris
                        ? 'text-gray-500 line-through decoration-gray-400'
                        : marcada
                        ? 'bg-amber-100 underline decoration-[#fbc50b] decoration-2 underline-offset-4'
                        : 'hover:bg-gray-100',
                )}
              >
                {esItem && <span aria-hidden className="select-none">•</span>}
                <span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong className="font-bold">{children}</strong> }}>
                    {linea.replace(/^(\d+[.)]|[-*•])\s+/, '')}
                  </ReactMarkdown>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Caso ────────────────────────────────────────────────────────────────

function CaseBody({ block }: { block: CaseBlock }) {
  return (
    <div className="p-3.5">
      <p className="text-sm font-bold text-[#09222d]">{block.name}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
        {block.facts.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      {block.question && (
        <p className="mt-2.5 text-[15px]">
          <strong>Pregunta:</strong> {block.question}
        </p>
      )}
    </div>
  )
}

// ── Diagrama (SVG propio: lib/diagram-layout.ts y diagram-svg.tsx) ──

function DiagramBody({ block }: { block: DiagramBlock }) {
  return (
    <div className="p-3.5">
      <DiagramSvg block={block} />
    </div>
  )
}

// ── Vista ampliada ──────────────────────────────────────────────────────

function BlockModal({ block, onClose }: { block: SupportBlock; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const esImagen = block.type === 'image' || block.type === 'compare'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={block.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09222d]/90 p-4 md:p-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-6xl flex-wrap overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('flex min-w-0 flex-col', esImagen ? 'flex-[999_1_560px] bg-[#0d1b22]' : 'flex-1')}>
          <div className={cn('flex items-center gap-2 px-4 py-3', esImagen ? 'text-white' : 'border-b border-gray-200 text-[#09222d]')}>
            <p className="flex-1 font-semibold">{block.title}</p>
            {esImagen && (
              <>
                <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="h-11 w-11 rounded-lg border border-white/25 flex items-center justify-center">
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="min-w-14 text-center text-sm">{Math.round(zoom * 100)} %</span>
                <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="h-11 w-11 rounded-lg border border-white/25 flex items-center justify-center">
                  <ZoomIn className="h-5 w-5" />
                </button>
              </>
            )}
            <button type="button" aria-label="Cerrar" onClick={onClose} className="h-11 w-11 rounded-lg flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {block.type === 'image' && (
              <div className="relative mx-auto w-fit origin-top transition-transform" style={{ transform: `scale(${zoom})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.url} alt={block.description} className="block max-h-[70vh] max-w-full rounded-lg" />
                <Markers block={block} size={34} />
              </div>
            )}
            {block.type === 'compare' && (
              <div className="grid grid-cols-2 gap-4 origin-top transition-transform" style={{ transform: `scale(${zoom})` }}>
                {block.items.map((it, i) => (
                  <figure key={i} className="m-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.description} className="w-full rounded-lg" />
                    <figcaption className="mt-1.5 text-center text-sm text-white/80">{it.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {block.type === 'text' && <TextBody block={block} large />}
            {block.type === 'table' && <TableBody block={block} />}
            {block.type === 'diagram' && (
              <div className="mx-auto max-w-2xl">
                <DiagramSvg block={block} width={560} />
              </div>
            )}
            {block.type === 'simulator' && (
              <div className="mx-auto max-w-2xl">
                <SimulatorBody block={block} large />
              </div>
            )}
            {block.type === 'classify' && (
              <div className="mx-auto max-w-2xl">
                <ClassifyBody block={block} />
              </div>
            )}
          </div>
        </div>
        {block.type === 'image' && (
          <aside className="flex flex-[1_1_320px] max-w-sm min-w-[280px] flex-col border-l border-gray-200">
            <MarkerList block={block} />
            <div className="mx-3.5 mt-3 rounded-xl bg-gray-100 p-3 text-sm leading-relaxed">
              <p className="mb-1 text-xs font-semibold text-gray-600 flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" aria-hidden /> Lo que Sophia lee de esta imagen
              </p>
              {block.description}
            </div>
            <div className="flex-1" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-gray-200 px-3.5 py-3 text-xs">
              <dt className="text-gray-600">Fuente</dt>
              <dd>{block.source || 'sin registrar'}</dd>
              <dt className="text-gray-600">Licencia</dt>
              <dd>{block.license}</dd>
              <dt className="text-gray-600">Estado</dt>
              <dd className={block.validated ? 'font-bold text-green-800' : 'font-bold text-amber-800'}>
                {block.validated ? 'Validada por el área técnica' : 'Pendiente de validación'}
              </dd>
            </dl>
          </aside>
        )}
      </div>
    </div>
  )
}
