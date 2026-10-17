'use client'

/**
 * Imágenes del material de apoyo: subir (Cloudinary → banco del curso →
 * descripción con IA) y elegir del banco. Las usan el editor de material y la
 * pestaña «Banco de imágenes». Spec: investigacion/panel-de-apoyo-especificacion.md §9.3
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BankImage {
  id: string
  courseId: string
  url: string
  description: string
  kind: 'scene' | 'term' | 'equipment' | 'diagram'
  source: string
  license: string
  validated: boolean
  uploadedBy: string | null
  validatedBy: string | null
  validatedAt: string | null
  tags: string[]
  createdAt: string
  usos?: { lessonId: string; title: string }[]
}

export const KIND_LABELS: Record<BankImage['kind'], string> = {
  scene: 'Escena de caso',
  term: 'Palabra técnica',
  equipment: 'Equipo o cosa física',
  diagram: 'Esquema',
}

export const KIND_HINTS: Record<BankImage['kind'], string> = {
  scene: 'Muestra una situación sin señalar el peligro: el alumno lo descubre',
  term: 'Una foto pequeña junto a su definición',
  equipment: 'Muestra el equipo o la pieza; se puede señalar sus partes',
  diagram: 'Un esquema ya hecho (plano, diagrama del fabricante)',
}

async function leerError(res: Response, porDefecto: string) {
  const j = (await res.json().catch(() => ({}))) as { error?: string }
  return j.error || porDefecto
}

export async function describirImagen(imageUrl: string, expectedContent?: string) {
  const res = await fetch('/api/upload/describe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, expectedContent }),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await leerError(res, 'No se pudo describir la imagen'))
  return (await res.json()) as { description: string; isRelevant: boolean | null; relevanceNote: string | null }
}

export async function editarImagenDelBanco(courseId: string, imageId: string, cambios: Partial<Pick<BankImage, 'description' | 'kind' | 'source' | 'license' | 'tags' | 'validated'>>) {
  const res = await fetch(`/api/planner/course/${courseId}/images/${imageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await leerError(res, 'No se pudo guardar la imagen'))
  return (await res.json()) as { image: BankImage; leccionesActualizadas: number; aviso: string | null }
}

/**
 * Sube un archivo, lo registra en el banco del curso y le pide la descripción
 * a la IA. Devuelve la imagen del banco y, si la IA la ve poco relevante, el aviso.
 */
export async function subirAlBanco(file: File, folder: string, courseId: string, expectedContent?: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  const up = await fetch('/api/upload/image', { method: 'POST', body: form, credentials: 'include' })
  if (!up.ok) throw new Error(await leerError(up, 'Error al subir la imagen'))
  const { url } = (await up.json()) as { url: string }

  const reg = await fetch(`/api/planner/course/${courseId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    credentials: 'include',
  })
  if (!reg.ok) throw new Error(await leerError(reg, 'No se pudo registrar la imagen en el banco'))
  let { image } = (await reg.json()) as { image: BankImage }

  let aviso: string | null = null
  try {
    const d = await describirImagen(url, expectedContent)
    if (d.description) image = (await editarImagenDelBanco(courseId, image.id, { description: d.description })).image
    if (d.isRelevant === false && d.relevanceNote) aviso = d.relevanceNote
  } catch {
    aviso = 'La imagen se subió, pero la IA no pudo describirla: escribe la descripción a mano.'
  }
  return { image, aviso }
}

export async function listarBanco(courseId: string): Promise<BankImage[]> {
  const res = await fetch(`/api/planner/course/${courseId}/images`, { credentials: 'include' })
  if (!res.ok) throw new Error(await leerError(res, 'No se pudo leer el banco de imágenes'))
  return ((await res.json()) as { images: BankImage[] }).images
}

export function ValidationBadge({ validated }: { validated: boolean }) {
  return validated ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-800">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Validada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
      <Clock className="h-3.5 w-3.5" aria-hidden /> Sin validar: el alumno no la ve
    </span>
  )
}

/** Diálogo para elegir una imagen del banco del curso. */
export function BankPicker({ courseId, onPick, onClose }: { courseId: string; onPick: (img: BankImage) => void; onClose: () => void }) {
  const [imagenes, setImagenes] = useState<BankImage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    let vivo = true
    listarBanco(courseId)
      .then((l) => vivo && setImagenes(l))
      .catch((e: Error) => vivo && setError(e.message))
    return () => {
      vivo = false
    }
  }, [courseId])

  const f = filtro.trim().toLowerCase()
  const visibles = (imagenes ?? []).filter((i) => !f || `${i.description} ${i.tags.join(' ')} ${i.source}`.toLowerCase().includes(f))

  return (
    <div role="dialog" aria-modal="true" aria-label="Elegir del banco" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="flex-1 font-semibold">Banco de imágenes del curso</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b px-4 py-2">
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-gray-400" aria-hidden />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por descripción, fuente o lección" className="flex-1 outline-none" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!imagenes && !error && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </p>
          )}
          {imagenes && visibles.length === 0 && (
            <p className="text-sm text-gray-500">
              {imagenes.length === 0 ? 'El banco está vacío. Sube una imagen o adopta las de las lecciones desde la pestaña «Banco de imágenes».' : 'Ninguna imagen coincide.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibles.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onPick(img)}
                className={cn('overflow-hidden rounded-lg border text-left hover:border-blue-500 hover:shadow-md', !img.validated && 'border-amber-300')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.description} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-1 p-2">
                  <p className="line-clamp-2 text-xs text-gray-700">{img.description || 'Sin descripción'}</p>
                  <p className="text-[11px] text-gray-500">{KIND_LABELS[img.kind]}</p>
                  <ValidationBadge validated={img.validated} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
