'use client'

/**
 * Formulario de un bloque del material de apoyo, uno por tipo.
 * Spec: investigacion/panel-de-apoyo-especificacion.md §9.1
 */
import { useRef, useState } from 'react'
import { AlertTriangle, ImagePlus, Library, Loader2, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { captionLeaks } from '@/lib/material-editor'
import type {
  Activity,
  CaseBlock,
  CompareBlock,
  DiagramBlock,
  SimulatorBlock,
  FormulaBlock,
  ImageBlock,
  ShowWhen,
  SupportBlock,
  TableBlock,
  TextBlock,
} from '@/types/lesson'
import { MarkerEditor } from './marker-editor'
import {
  BankPicker,
  KIND_HINTS,
  KIND_LABELS,
  ValidationBadge,
  describirImagen,
  editarImagenDelBanco,
  subirAlBanco,
  type BankImage,
} from './image-tools'

const input = 'w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none'

function Campo({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500">{hint}</span>}
    </label>
  )
}

const SHOW_WHEN: { value: ShowWhen; label: string; hint: string }[] = [
  { value: 'on_start', label: 'Al entrar a la actividad', hint: 'Lo que la pregunta necesita a la vista' },
  { value: 'on_reference', label: 'Cuando Sophia lo cite', hint: 'Sophia lo muestra en el momento justo' },
  { value: 'on_demand', label: 'Si el alumno lo pide', hint: 'Una ayuda opcional, con botón en el panel' },
]

export interface BlockFormProps {
  block: SupportBlock
  onChange: (block: SupportBlock) => void
  activity: Activity
  courseId: string
  imageFolder: string
}

export function BlockForm(props: BlockFormProps) {
  const { block, onChange } = props
  const set = <K extends keyof SupportBlock>(k: K, v: SupportBlock[K]) => onChange({ ...block, [k]: v } as SupportBlock)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" hint="Sophia lo cita por este título: «mira el Semáforo de faltas»">
          <input className={input} value={block.title} maxLength={60} onChange={(e) => set('title', e.target.value)} />
        </Campo>
        <Campo label="Cuándo aparece en el panel" hint={SHOW_WHEN.find((s) => s.value === (block.showWhen ?? 'on_start'))?.hint}>
          <select className={input} value={block.showWhen ?? 'on_start'} onChange={(e) => set('showWhen', e.target.value as ShowWhen)}>
            {SHOW_WHEN.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!block.pinned} onChange={(e) => set('pinned', e.target.checked || undefined)} />
          Fijar en las actividades siguientes
        </label>
        {(block.type === 'table' || block.type === 'text') && (
          <label className="flex items-center gap-2" title="Sophia recibe el contenido completo para corregir (no solo una muestra)">
            <input type="checkbox" checked={!!block.forVerifier} onChange={(e) => set('forVerifier', e.target.checked || undefined)} />
            Sophia lo necesita completo para corregir
          </label>
        )}
        <span className="text-xs text-gray-500">
          id: <code>{block.id}</code>
        </span>
      </div>

      {block.type === 'image' && <ImageForm {...props} block={block} />}
      {block.type === 'compare' && <CompareForm {...props} block={block} />}
      {block.type === 'formula' && <FormulaForm block={block} onChange={onChange} />}
      {block.type === 'table' && <TableForm block={block} onChange={onChange} />}
      {block.type === 'text' && <TextForm block={block} onChange={onChange} />}
      {block.type === 'case' && <CaseForm block={block} onChange={onChange} />}
      {block.type === 'diagram' && <DiagramForm block={block} onChange={onChange} />}
      {block.type === 'simulator' && <SimulatorForm block={block} onChange={onChange} />}

      {block.type !== 'image' && block.type !== 'compare' && (
        <Campo label="Fuente (opcional)" hint="Reglamento, manual, norma: aparece bajo el bloque">
          <input className={input} value={block.source ?? ''} maxLength={160} onChange={(e) => set('source', e.target.value || undefined)} />
        </Campo>
      )}
    </div>
  )
}

// ── Imagen ──────────────────────────────────────────────────────────────

function useSubida(courseId: string, imageFolder: string, activity: Activity) {
  const [subiendo, setSubiendo] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)
  const esperado = activity.teaching.image_suggestions?.join('. ') || undefined
  const elegir = (alSubir: (img: BankImage) => void) => {
    const el = archivo.current
    if (!el) return
    el.onchange = async () => {
      const f = el.files?.[0]
      el.value = ''
      if (!f) return
      setSubiendo(true)
      try {
        const { image, aviso } = await subirAlBanco(f, imageFolder, courseId, esperado)
        alSubir(image)
        toast.success('Imagen subida al banco del curso')
        if (aviso) toast.warning(aviso, { duration: 8000 })
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setSubiendo(false)
      }
    }
    el.click()
  }
  const inputArchivo = <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" />
  return { subiendo, elegir, inputArchivo }
}

/** Copia los datos de una imagen del banco a un bloque. */
function desdeBanco(img: BankImage): Pick<ImageBlock, 'url' | 'description' | 'kind' | 'source' | 'license' | 'validated' | 'bankId'> {
  return { url: img.url, description: img.description, kind: img.kind, source: img.source, license: img.license, validated: img.validated, bankId: img.id }
}

function ImageForm({ block, onChange, activity, courseId, imageFolder }: BlockFormProps & { block: ImageBlock }) {
  const { subiendo, elegir, inputArchivo } = useSubida(courseId, imageFolder, activity)
  const [banco, setBanco] = useState(false)
  const [describiendo, setDescribiendo] = useState(false)
  const [validando, setValidando] = useState(false)
  const set = (c: Partial<ImageBlock>) => onChange({ ...block, ...c })

  // Con bankId, los datos de la foto viven en el banco: se editan ahí y se copian aquí.
  const guardarEnBanco = async (c: Partial<Pick<ImageBlock, 'description' | 'kind' | 'source' | 'license'>>) => {
    set(c)
    if (!block.bankId) return
    try {
      await editarImagenDelBanco(courseId, block.bankId, c)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const validar = async () => {
    if (!block.bankId) {
      set({ validated: !block.validated })
      return
    }
    setValidando(true)
    try {
      const r = await editarImagenDelBanco(courseId, block.bankId, { validated: !block.validated, description: block.description, source: block.source ?? '', license: block.license, kind: block.kind })
      set(desdeBanco(r.image))
      if (r.aviso) toast.warning(r.aviso, { duration: 8000 })
      else toast.success(r.image.validated ? 'Imagen validada' : 'Validación retirada')
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 })
    } finally {
      setValidando(false)
    }
  }

  const describir = async () => {
    if (!block.url) return
    setDescribiendo(true)
    try {
      const d = await describirImagen(block.url, activity.teaching.image_suggestions?.join('. ') || undefined)
      if (d.description) await guardarEnBanco({ description: d.description })
      if (d.isRelevant === false && d.relevanceNote) toast.warning(d.relevanceNote, { duration: 8000 })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDescribiendo(false)
    }
  }

  return (
    <div className="space-y-4">
      {inputArchivo}
      {banco && (
        <BankPicker
          courseId={courseId}
          onClose={() => setBanco(false)}
          onPick={(img) => {
            set(desdeBanco(img))
            setBanco(false)
          }}
        />
      )}
      {!block.url ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => elegir((img) => set(desdeBanco(img)))} disabled={subiendo} className="inline-flex items-center gap-2 rounded-md border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:border-amber-400">
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {subiendo ? 'Subiendo y describiendo…' : 'Subir imagen'}
          </button>
          <button type="button" onClick={() => setBanco(true)} className="inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm hover:bg-gray-50">
            <Library className="h-4 w-4" /> Elegir del banco
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ValidationBadge validated={block.validated} />
            <button type="button" onClick={validar} disabled={validando} className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">
              {validando ? 'Guardando…' : block.validated ? 'Quitar validación' : 'Validar (área técnica)'}
            </button>
            <button type="button" onClick={() => setBanco(true)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">
              <Library className="h-3.5 w-3.5" /> Cambiar por otra del banco
            </button>
            <button type="button" onClick={() => elegir((img) => set(desdeBanco(img)))} disabled={subiendo} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50">
              {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Subir otra
            </button>
            {!block.bankId && <span className="text-[11px] text-gray-500">Imagen de una versión anterior: no está en el banco.</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Uso" hint={KIND_HINTS[block.kind]}>
              <select className={input} value={block.kind} onChange={(e) => guardarEnBanco({ kind: e.target.value as ImageBlock['kind'] })}>
                {(Object.keys(KIND_LABELS) as ImageBlock['kind'][]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fuente" hint="Fabricante, planta, banco de fotos. Nunca una imagen generada con IA">
              <input className={input} value={block.source ?? ''} maxLength={160} onChange={(e) => set({ source: e.target.value })} onBlur={(e) => guardarEnBanco({ source: e.target.value })} />
            </Campo>
            <Campo label="Licencia" hint="Ej.: uso interno CETEMIN, CC BY 4.0, foto propia">
              <input className={input} value={block.license} maxLength={160} onChange={(e) => set({ license: e.target.value })} onBlur={(e) => guardarEnBanco({ license: e.target.value })} />
            </Campo>
          </div>
          <Campo label="Descripción para Sophia" hint="Es lo único que Sophia «ve» de la foto. En una escena, describe la situación sin decir qué está mal">
            <div className="space-y-1">
              <textarea className={input} rows={3} value={block.description} onChange={(e) => set({ description: e.target.value })} onBlur={(e) => guardarEnBanco({ description: e.target.value })} />
              <button type="button" onClick={describir} disabled={describiendo} className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline">
                <Sparkles className="h-3.5 w-3.5" /> {describiendo ? 'Describiendo…' : 'Describir con IA'}
              </button>
            </div>
          </Campo>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-700">Señalamientos</p>
            <MarkerEditor block={block} onChange={(markers) => set({ markers: markers.length ? markers : undefined })} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Comparación ─────────────────────────────────────────────────────────

function CompareForm({ block, onChange, activity, courseId, imageFolder }: BlockFormProps & { block: CompareBlock }) {
  const { subiendo, elegir, inputArchivo } = useSubida(courseId, imageFolder, activity)
  const [banco, setBanco] = useState(false)
  const respuesta = activity.verification.success_criteria.must_include
  const agregar = (img: BankImage) =>
    onChange({ ...block, items: [...block.items, { url: img.url, description: img.description, license: img.license || 'sin registrar', caption: `Foto ${block.items.length + 1}` }].slice(0, 3) })
  const setItem = (i: number, c: Partial<CompareBlock['items'][number]>) => onChange({ ...block, items: block.items.map((it, j) => (j === i ? { ...it, ...c } : it)) })

  return (
    <div className="space-y-3">
      {inputArchivo}
      {banco && (
        <BankPicker
          courseId={courseId}
          onClose={() => setBanco(false)}
          onPick={(img) => {
            agregar(img)
            setBanco(false)
          }}
        />
      )}
      <p className="text-xs text-gray-600">Dos o tres fotos. Los pies deben ser neutros («Foto 1», «Trabajador A»): no pueden delatar la respuesta.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {block.items.map((it, i) => {
          const fugas = captionLeaks(it.caption, respuesta)
          return (
            <div key={i} className="space-y-1.5 rounded-lg border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={it.description} className="aspect-square w-full rounded object-cover" />
              <input className={input} value={it.caption} maxLength={30} onChange={(e) => setItem(i, { caption: e.target.value })} placeholder="Pie neutro" />
              {fugas.length > 0 && (
                <p className="flex items-start gap-1 text-[11px] text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> El pie repite palabras de la respuesta esperada: {fugas.join(', ')}
                </p>
              )}
              <button type="button" onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                <Trash2 className="h-3 w-3" /> Quitar
              </button>
            </div>
          )
        })}
      </div>
      {block.items.length < 3 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => elegir(agregar)} disabled={subiendo} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Subir foto
          </button>
          <button type="button" onClick={() => setBanco(true)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
            <Library className="h-4 w-4" /> Elegir del banco
          </button>
        </div>
      )}
    </div>
  )
}

// ── Fórmula ─────────────────────────────────────────────────────────────

function FormulaForm({ block, onChange }: { block: FormulaBlock; onChange: (b: SupportBlock) => void }) {
  const terms = block.terms ?? []
  const set = (c: Partial<FormulaBlock>) => onChange({ ...block, ...c })
  const setTerm = (i: number, c: Partial<NonNullable<FormulaBlock['terms']>[number]>) => set({ terms: terms.map((t, j) => (j === i ? { ...t, ...c } : t)) })
  const ej = block.example
  const setEj = (c: Partial<NonNullable<FormulaBlock['example']>>) => set({ example: { label: '', rows: [], total: '', ...ej, ...c } })
  return (
    <div className="space-y-3">
      <Campo label="Expresión" hint="Texto plano: «Nota final = CV × 10 % + EP × 20 % + …»">
        <input className={input} value={block.expression} maxLength={200} onChange={(e) => set({ expression: e.target.value })} />
      </Campo>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">Términos</p>
        {terms.map((t, i) => (
          <div key={i} className="mb-1.5 flex gap-1.5">
            <input className={cn(input, 'w-20')} placeholder="CV" value={t.symbol} maxLength={12} onChange={(e) => setTerm(i, { symbol: e.target.value })} />
            <input className={input} placeholder="Significado" value={t.meaning} maxLength={60} onChange={(e) => setTerm(i, { meaning: e.target.value })} />
            <input className={cn(input, 'w-24')} placeholder="10 %" value={t.value ?? ''} maxLength={20} onChange={(e) => setTerm(i, { value: e.target.value || undefined })} />
            <button type="button" aria-label="Quitar término" onClick={() => set({ terms: terms.filter((_, j) => j !== i) })} className="px-1 text-red-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => set({ terms: [...terms, { symbol: '', meaning: '' }] })} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Término</button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!ej} onChange={(e) => set({ example: e.target.checked ? { label: '', rows: [{ term: '', value: '', weight: '', result: '' }], total: '' } : undefined })} />
        Con ejemplo resuelto
      </label>
      {ej && (
        <div className="space-y-1.5 rounded-lg bg-gray-50 p-2">
          <div className="flex gap-1.5">
            <input className={input} placeholder="Quién (ej.: Pedro)" value={ej.label} maxLength={40} onChange={(e) => setEj({ label: e.target.value })} />
            <input className={cn(input, 'w-36')} placeholder="Total (13,65 → 14)" value={ej.total} maxLength={30} onChange={(e) => setEj({ total: e.target.value })} />
          </div>
          {ej.rows.map((r, i) => (
            <div key={i} className="flex gap-1.5">
              {(['term', 'value', 'weight', 'result'] as const).map((k) => (
                <input key={k} className={input} placeholder={{ term: 'Evento', value: 'Nota', weight: 'Peso', result: 'Aporte' }[k]} value={r[k]} maxLength={20} onChange={(e) => setEj({ rows: ej.rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} />
              ))}
              <button type="button" aria-label="Quitar fila" onClick={() => setEj({ rows: ej.rows.filter((_, j) => j !== i) })} className="px-1 text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {ej.rows.length < 8 && (
            <button type="button" onClick={() => setEj({ rows: [...ej.rows, { term: '', value: '', weight: '', result: '' }] })} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Fila</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tabla ───────────────────────────────────────────────────────────────

function TableForm({ block, onChange }: { block: TableBlock; onChange: (b: SupportBlock) => void }) {
  const set = (c: Partial<TableBlock>) => onChange({ ...block, ...c })
  const resaltadas = new Set(block.highlight?.rows ?? [])
  const toggleFila = (i: number) => {
    const s = new Set(resaltadas)
    if (s.has(i)) s.delete(i)
    else s.add(i)
    set({ highlight: s.size ? { ...block.highlight, rows: [...s].sort((a, b) => a - b) } : undefined })
  }
  const quitarFila = (i: number) =>
    set({
      rows: block.rows.filter((_, j) => j !== i),
      highlight: block.highlight?.rows ? { ...block.highlight, rows: block.highlight.rows.filter((r) => r !== i).map((r) => (r > i ? r - 1 : r)) } : block.highlight,
    })
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {block.columns.map((c, j) => (
                <th key={j} className="border p-1">
                  <div className="flex gap-1">
                    <input className={cn(input, 'font-semibold')} value={c} maxLength={60} onChange={(e) => set({ columns: block.columns.map((x, k) => (k === j ? e.target.value : x)) })} />
                    {block.columns.length > 1 && (
                      <button type="button" aria-label="Quitar columna" onClick={() => set({ columns: block.columns.filter((_, k) => k !== j), rows: block.rows.map((r) => r.filter((_, k) => k !== j)) })} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 border p-1 text-[11px] font-normal text-gray-500">Resaltar</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className={cn(resaltadas.has(i) && 'bg-amber-50')}>
                {r.map((celda, j) => (
                  <td key={j} className="border p-1">
                    <input className={input} value={celda} maxLength={60} onChange={(e) => set({ rows: block.rows.map((x, k) => (k === i ? x.map((y, l) => (l === j ? e.target.value : y)) : x)) })} />
                  </td>
                ))}
                <td className="border p-1 text-center">
                  <input type="checkbox" checked={resaltadas.has(i)} onChange={() => toggleFila(i)} aria-label={`Resaltar fila ${i + 1}`} />
                  <button type="button" aria-label="Quitar fila" onClick={() => quitarFila(i)} className="ml-2 text-red-500"><Trash2 className="inline h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 text-xs">
        {block.rows.length < 20 && <button type="button" onClick={() => set({ rows: [...block.rows, block.columns.map(() => '')] })} className="inline-flex items-center gap-1 text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Fila</button>}
        {block.columns.length < 6 && <button type="button" onClick={() => set({ columns: [...block.columns, `Columna ${block.columns.length + 1}`], rows: block.rows.map((r) => [...r, '']) })} className="inline-flex items-center gap-1 text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Columna</button>}
        <span className="text-gray-500">{block.rows.length} de 20 filas · {block.columns.length} de 6 columnas</span>
      </div>
      <Campo label="Leyenda (opcional)">
        <input className={input} value={block.legend ?? ''} maxLength={200} onChange={(e) => set({ legend: e.target.value || undefined })} />
      </Campo>
    </div>
  )
}

// ── Texto ───────────────────────────────────────────────────────────────

function TextForm({ block, onChange }: { block: TextBlock; onChange: (b: SupportBlock) => void }) {
  const palabras = block.body.trim().split(/\s+/).filter(Boolean).length
  return (
    <div className="space-y-2">
      <Campo label="Texto" hint="Markdown simple: **negrita**, listas «1.». Sophia no lo copia: dice «lee el texto del panel»">
        <textarea className={cn(input, 'font-mono')} rows={8} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} />
      </Campo>
      <div className="flex items-center justify-between">
        <select className={cn(input, 'w-auto')} value={block.kind ?? ''} onChange={(e) => onChange({ ...block, kind: (e.target.value || undefined) as TextBlock['kind'] })}>
          <option value="">Tipo de texto…</option>
          <option value="fragment">Fragmento de manual o lectura</option>
          <option value="consigna">Consigna</option>
          <option value="norma">Norma o reglamento</option>
          <option value="rubrica">Rúbrica</option>
        </select>
        <span className={cn('text-xs', palabras > 400 ? 'font-semibold text-red-600' : 'text-gray-500')}>{palabras} de 400 palabras</span>
      </div>
    </div>
  )
}

// ── Caso ────────────────────────────────────────────────────────────────

function CaseForm({ block, onChange }: { block: CaseBlock; onChange: (b: SupportBlock) => void }) {
  return (
    <div className="space-y-3">
      <Campo label="Nombre" hint="El personaje: «Rosa», «Luis, estudiante de EOM»">
        <input className={input} value={block.name} maxLength={40} onChange={(e) => onChange({ ...block, name: e.target.value })} />
      </Campo>
      <Campo label="Hechos, uno por línea" hint="Datos fijos que el alumno usa para decidir (máximo 8)">
        <textarea className={input} rows={6} value={block.facts.join('\n')} onChange={(e) => onChange({ ...block, facts: e.target.value.split('\n').slice(0, 8) })} />
      </Campo>
      <Campo label="Pregunta (opcional)">
        <input className={input} value={block.question ?? ''} maxLength={200} onChange={(e) => onChange({ ...block, question: e.target.value || undefined })} />
      </Campo>
    </div>
  )
}

// ── Diagrama ────────────────────────────────────────────────────────────

function DiagramForm({ block, onChange }: { block: DiagramBlock; onChange: (b: SupportBlock) => void }) {
  const setNodo = (i: number, c: Partial<DiagramBlock['nodes'][number]>) => onChange({ ...block, nodes: block.nodes.map((n, j) => (j === i ? { ...n, ...c } : n)) })
  const nuevoId = () => {
    for (let k = block.nodes.length + 1; ; k++) if (!block.nodes.some((n) => n.id === `n${k}`)) return `n${k}`
  }
  const esJerarquia = block.kind === 'hierarchy'
  const setPadre = (hijo: string, padre: string) => {
    const parent = { ...(block.parent ?? {}) }
    if (padre) parent[hijo] = padre
    else delete parent[hijo]
    onChange({ ...block, parent: Object.keys(parent).length ? parent : undefined })
  }
  // Quitar un paso limpia sus referencias como padre o como hijo.
  const quitarNodo = (i: number) => {
    const id = block.nodes[i].id
    const parent = Object.fromEntries(Object.entries(block.parent ?? {}).filter(([h, p]) => h !== id && p !== id))
    onChange({
      ...block,
      nodes: block.nodes.filter((_, j) => j !== i),
      parent: Object.keys(parent).length ? parent : undefined,
      edges: block.edges?.filter((e) => e.from !== id && e.to !== id),
    })
  }
  const etiquetaHacia = (i: number) => block.edges?.find((e) => e.from === block.nodes[i].id && e.to === block.nodes[i + 1]?.id)?.label ?? ''
  const setEtiqueta = (i: number, label: string) => {
    const from = block.nodes[i].id
    const to = block.nodes[i + 1].id
    const resto = (block.edges ?? []).filter((e) => !(e.from === from && e.to === to))
    const edges = label ? [...resto, { from, to, label }] : resto
    onChange({ ...block, edges: edges.length ? edges : undefined })
  }
  return (
    <div className="space-y-3">
      <Campo label="Forma" hint="Nunca un dibujo de equipo: para eso va una foto con fuente">
        <select className={input} value={block.kind} onChange={(e) => onChange({ ...block, kind: e.target.value as DiagramBlock['kind'] })}>
          <option value="flow">Flujo (pasos en orden)</option>
          <option value="cycle">Ciclo (vuelve al primero)</option>
          <option value="hierarchy">Jerarquía</option>
          <option value="timeline">Línea de tiempo</option>
        </select>
      </Campo>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">{esJerarquia ? 'Elementos' : 'Pasos'} ({block.nodes.length} de 12)</p>
        {block.nodes.map((n, i) => (
          <div key={n.id} className="mb-1.5 space-y-1">
            <div className="flex gap-1.5">
              <span className="w-6 pt-1.5 text-right text-xs font-bold text-gray-500">{i + 1}</span>
              <input className={input} placeholder={esJerarquia ? 'Elemento' : 'Paso'} value={n.label} maxLength={40} onChange={(e) => setNodo(i, { label: e.target.value })} />
              <input className={input} placeholder="Nota (opcional)" value={n.note ?? ''} maxLength={80} onChange={(e) => setNodo(i, { note: e.target.value || undefined })} />
              <button type="button" aria-label="Quitar paso" disabled={block.nodes.length <= 2} onClick={() => quitarNodo(i)} className="px-1 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
            {esJerarquia && (
              <label className="ml-8 flex items-center gap-2 text-xs text-gray-600">
                Depende de
                <select className={cn(input, 'w-auto py-1 text-xs')} value={block.parent?.[n.id] ?? ''} onChange={(e) => setPadre(n.id, e.target.value)}>
                  <option value="">— nadie (es de primer nivel)</option>
                  {block.nodes.filter((o) => o.id !== n.id).map((o) => (
                    <option key={o.id} value={o.id}>{o.label || o.id}</option>
                  ))}
                </select>
              </label>
            )}
            {(block.kind === 'flow' || block.kind === 'cycle') && i < block.nodes.length - 1 && (
              <input className={cn(input, 'ml-8 w-[calc(100%-2rem)] py-1 text-xs')} placeholder="Texto en la flecha hacia el siguiente (opcional, ej.: «si hay energía residual»)" value={etiquetaHacia(i)} maxLength={30} onChange={(e) => setEtiqueta(i, e.target.value)} />
            )}
          </div>
        ))}
        {block.nodes.length < 12 && (
          <button type="button" onClick={() => onChange({ ...block, nodes: [...block.nodes, { id: nuevoId(), label: '' }] })} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus className="h-3 w-3" /> {esJerarquia ? 'Elemento' : 'Paso'}</button>
        )}
      </div>
    </div>
  )
}

// ── Ecualizador ─────────────────────────────────────────────────────────

function SimulatorForm({ block, onChange }: { block: SimulatorBlock; onChange: (b: SupportBlock) => void }) {
  const set = (c: Partial<SimulatorBlock>) => onChange({ ...block, ...c })
  const suma = block.variables.reduce((s, v) => s + (Number(v.weight) || 0), 0)
  const nuevoId = (label: string) => {
    const base = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16) || 'nota'
    let id = base
    for (let k = 2; block.variables.some((v) => v.id === id); k++) id = `${base}-${k}`
    return id
  }
  const setVar = (i: number, c: Partial<SimulatorBlock['variables'][number]>) => set({ variables: block.variables.map((v, j) => (j === i ? { ...v, ...c } : v)) })
  const quitarVar = (i: number) => {
    const id = block.variables[i].id
    set({
      variables: block.variables.filter((_, j) => j !== i),
      presets: block.presets.map((p) => ({ ...p, values: Object.fromEntries(Object.entries(p.values).filter(([k]) => k !== id)) })),
    })
  }
  const setPreset = (i: number, c: Partial<SimulatorBlock['presets'][number]>) => set({ presets: block.presets.map((p, j) => (j === i ? { ...p, ...c } : p)) })
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">
          Notas y su peso{' '}
          <span className={cn('font-normal', Math.abs(suma - 100) > 0.5 ? 'text-red-600' : 'text-gray-500')}>(suman {suma} %{Math.abs(suma - 100) > 0.5 ? ': deben sumar 100' : ''})</span>
        </p>
        {block.variables.map((v, i) => (
          <div key={v.id} className="mb-1.5 flex items-center gap-1.5">
            <input className={input} placeholder="CV" value={v.label} maxLength={20} onChange={(e) => setVar(i, { label: e.target.value })} />
            <input className={cn(input, 'w-20')} type="number" min={1} max={100} value={v.weight} onChange={(e) => setVar(i, { weight: Number(e.target.value) })} aria-label={`Peso de ${v.label}`} />
            <span className="text-xs text-gray-500">%</span>
            <button type="button" aria-label="Quitar nota" disabled={block.variables.length <= 2} onClick={() => quitarVar(i)} className="px-1 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {block.variables.length < 8 && (
          <button type="button" onClick={() => set({ variables: [...block.variables, { id: nuevoId(`nota ${block.variables.length + 1}`), label: `Nota ${block.variables.length + 1}`, weight: 10 }] })} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Nota</button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Campo label="Mínimo"><input className={input} type="number" value={block.scale.min} onChange={(e) => set({ scale: { ...block.scale, min: Number(e.target.value) } })} /></Campo>
        <Campo label="Máximo"><input className={input} type="number" value={block.scale.max} onChange={(e) => set({ scale: { ...block.scale, max: Number(e.target.value) } })} /></Campo>
        <Campo label="Aprueba con"><input className={input} type="number" value={block.scale.pass} onChange={(e) => set({ scale: { ...block.scale, pass: Number(e.target.value) } })} /></Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={block.scale.round === 'half_up'} onChange={(e) => set({ scale: { ...block.scale, round: e.target.checked ? 'half_up' : 'none' } })} />
        Redondear al entero (0,5 o más sube: 12,5 → 13)
      </label>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-700">Casos precargados (el primero es el que abre)</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-1 text-left text-xs font-medium text-gray-600">Caso</th>
                {block.variables.map((v) => <th key={v.id} className="border p-1 text-xs font-medium text-gray-600">{v.label}</th>)}
                <th className="border p-1" />
              </tr>
            </thead>
            <tbody>
              {block.presets.map((p, i) => (
                <tr key={i}>
                  <td className="border p-1"><input className={input} value={p.label} maxLength={20} onChange={(e) => setPreset(i, { label: e.target.value })} /></td>
                  {block.variables.map((v) => (
                    <td key={v.id} className="border p-1">
                      <input className={cn(input, 'w-16')} type="number" value={p.values[v.id] ?? ''} onChange={(e) => setPreset(i, { values: { ...p.values, [v.id]: Number(e.target.value) } })} aria-label={`${p.label}, ${v.label}`} />
                    </td>
                  ))}
                  <td className="border p-1 text-center"><button type="button" aria-label="Quitar caso" onClick={() => set({ presets: block.presets.filter((_, j) => j !== i) })} className="text-red-500"><Trash2 className="inline h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {block.presets.length < 4 && (
          <button type="button" onClick={() => set({ presets: [...block.presets, { label: `Caso ${block.presets.length + 1}`, values: Object.fromEntries(block.variables.map((v) => [v.id, block.scale.pass])) }] })} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"><Plus className="h-3 w-3" /> Caso</button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!block.allowOwnValues} onChange={(e) => set({ allowOwnValues: e.target.checked || undefined })} />
        Botón «Mis notas»: el alumno prueba con las suyas (no se guardan)
      </label>
    </div>
  )
}
