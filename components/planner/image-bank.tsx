'use client'

/**
 * Banco de imágenes del curso (planner, etapa 3). Una foto se sube y se
 * describe una vez y la usan varias lecciones. Validar la hace visible para
 * los alumnos en todas las lecciones que la usan.
 * Spec: investigacion/panel-de-apoyo-especificacion.md §9.3
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Sparkles, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  KIND_HINTS,
  KIND_LABELS,
  ValidationBadge,
  describirImagen,
  editarImagenDelBanco,
  listarBanco,
  subirAlBanco,
  type BankImage,
} from './material/image-tools'

type Filtro = 'todas' | 'pendientes' | 'validadas'
const input = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none'

export function ImageBank({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [imagenes, setImagenes] = useState<BankImage[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [subiendo, setSubiendo] = useState(false)
  const [adoptando, setAdoptando] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    try {
      setImagenes(await listarBanco(courseId))
    } catch (e) {
      toast.error((e as Error).message)
      setImagenes([])
    }
  }, [courseId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const reemplazar = (img: BankImage) => setImagenes((prev) => prev?.map((i) => (i.id === img.id ? { ...i, ...img } : i)) ?? prev)

  const subir = async (f: File) => {
    setSubiendo(true)
    try {
      const { aviso } = await subirAlBanco(f, `sophia/${courseId}/banco`, courseId)
      toast.success('Imagen subida. Complétala y pide que la validen.')
      if (aviso) toast.warning(aviso, { duration: 8000 })
      await cargar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  const adoptar = async () => {
    setAdoptando(true)
    try {
      const res = await fetch(`/api/planner/course/${courseId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adopt: true }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('No se pudieron adoptar las imágenes')
      const { adopted } = (await res.json()) as { adopted: number }
      toast.success(adopted ? `${adopted} imagen(es) de las lecciones entraron al banco` : 'Todas las imágenes de las lecciones ya estaban en el banco')
      await cargar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAdoptando(false)
    }
  }

  const visibles = (imagenes ?? []).filter((i) => (filtro === 'todas' ? true : filtro === 'validadas' ? i.validated : !i.validated))
  const pendientes = (imagenes ?? []).filter((i) => !i.validated).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <input
        ref={archivo}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void subir(f)
        }}
      />
      <Link href={`/planner/${courseId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> {courseTitle}
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Banco de imágenes</h1>
          <p className="text-sm text-gray-500">
            Las fotos del curso, subidas y descritas una sola vez. El alumno solo ve las validadas. Nunca fotos generadas con IA; una escena muestra la situación sin señalar el peligro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={adoptar} disabled={adoptando} className="gap-1.5" title="Trae al banco las imágenes que las lecciones ya usan">
            {adoptando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Adoptar las de las lecciones
          </Button>
          <Button onClick={() => archivo.current?.click()} disabled={subiendo} className="gap-1.5">
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {subiendo ? 'Subiendo…' : 'Subir imagen'}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 text-sm">
        {(['todas', 'pendientes', 'validadas'] as Filtro[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} className={cn('rounded-full px-3 py-1', filtro === f ? 'bg-[#09222d] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
            {f === 'todas' ? `Todas (${imagenes?.length ?? 0})` : f === 'pendientes' ? `Sin validar (${pendientes})` : `Validadas (${(imagenes?.length ?? 0) - pendientes})`}
          </button>
        ))}
      </div>

      {!imagenes ? (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-sm text-gray-500">
          {imagenes.length === 0 ? 'El banco está vacío. Sube una imagen o adopta las que las lecciones ya usan.' : 'Ninguna imagen en este filtro.'}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((img) => (
            <ImagenDelBanco key={img.id} courseId={courseId} img={img} onChange={reemplazar} onDeleted={() => setImagenes((p) => p?.filter((i) => i.id !== img.id) ?? p)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ImagenDelBanco({ courseId, img, onChange, onDeleted }: { courseId: string; img: BankImage; onChange: (i: BankImage) => void; onDeleted: () => void }) {
  const [borrador, setBorrador] = useState(img)
  const [ocupado, setOcupado] = useState<null | 'guardar' | 'validar' | 'describir' | 'borrar'>(null)
  const usos = img.usos ?? []

  const guardar = async (cambios: Partial<BankImage>) => {
    setOcupado('guardar')
    try {
      const r = await editarImagenDelBanco(courseId, img.id, cambios)
      onChange({ ...r.image, usos })
      if (r.leccionesActualizadas) toast.success(`Actualizada en ${r.leccionesActualizadas} lección(es)`)
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 })
      setBorrador(img)
    } finally {
      setOcupado(null)
    }
  }

  const validar = async () => {
    setOcupado('validar')
    try {
      const r = await editarImagenDelBanco(courseId, img.id, { validated: !img.validated, description: borrador.description, source: borrador.source, license: borrador.license, kind: borrador.kind })
      onChange({ ...r.image, usos })
      setBorrador({ ...r.image, usos })
      if (r.aviso) toast.warning(r.aviso, { duration: 8000 })
      else toast.success(r.image.validated ? 'Validada: ya la ven los alumnos' : 'Validación retirada: los alumnos dejan de verla')
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 })
    } finally {
      setOcupado(null)
    }
  }

  const describir = async () => {
    setOcupado('describir')
    try {
      const d = await describirImagen(img.url)
      if (d.description) {
        setBorrador((b) => ({ ...b, description: d.description }))
        await guardar({ description: d.description })
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  const borrar = async () => {
    if (!confirm('¿Borrar esta imagen del banco?')) return
    setOcupado('borrar')
    try {
      const res = await fetch(`/api/planner/course/${courseId}/images/${img.id}`, { method: 'DELETE', credentials: 'include' })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error || 'No se pudo borrar')
      onDeleted()
      toast.success('Imagen borrada del banco')
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 })
    } finally {
      setOcupado(null)
    }
  }

  const alSalir = (k: 'description' | 'source' | 'license') => () => {
    if (borrador[k] !== img[k]) void guardar({ [k]: borrador[k] })
  }

  return (
    <article className={cn('flex gap-3 rounded-lg border bg-white p-3', !img.validated && 'border-amber-300')}>
      <a href={img.url} target="_blank" rel="noreferrer" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.description} className="h-32 w-32 rounded-md object-cover" />
      </a>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ValidationBadge validated={img.validated} />
          <button type="button" onClick={validar} disabled={!!ocupado} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">
            {ocupado === 'validar' ? 'Guardando…' : img.validated ? 'Quitar validación' : 'Validar'}
          </button>
          <button type="button" onClick={describir} disabled={!!ocupado} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-700 hover:bg-violet-50">
            <Sparkles className="h-3.5 w-3.5" /> {ocupado === 'describir' ? 'Describiendo…' : 'Describir con IA'}
          </button>
          <button type="button" onClick={borrar} disabled={!!ocupado || usos.length > 0} title={usos.length ? 'La usa alguna lección: quítala de ahí primero' : 'Borrar del banco'} className="ml-auto rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <textarea className={input} rows={2} value={borrador.description} placeholder="Descripción: es lo único que Sophia «ve» de la foto" onChange={(e) => setBorrador({ ...borrador, description: e.target.value })} onBlur={alSalir('description')} />
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={input} value={borrador.kind} title={KIND_HINTS[borrador.kind]} onChange={(e) => {
            const kind = e.target.value as BankImage['kind']
            setBorrador({ ...borrador, kind })
            void guardar({ kind })
          }}>
            {(Object.keys(KIND_LABELS) as BankImage['kind'][]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          <input className={input} placeholder="Fuente" value={borrador.source} onChange={(e) => setBorrador({ ...borrador, source: e.target.value })} onBlur={alSalir('source')} />
          <input className={input} placeholder="Licencia" value={borrador.license} onChange={(e) => setBorrador({ ...borrador, license: e.target.value })} onBlur={alSalir('license')} />
        </div>
        <p className="text-[11px] text-gray-500">
          {usos.length ? `La usan: ${usos.map((u) => u.title).join(' · ')}` : 'No la usa ninguna lección todavía'}
        </p>
      </div>
    </article>
  )
}
