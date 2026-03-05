'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Activity, TeachingImage } from '@/types/lesson'

interface ResourceImage {
  activityId: string
  url: string
  fileName: string
  description: string
  showWhen: 'on_start' | 'on_reference' | 'on_demand'
}

interface Props {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  activities: Activity[]
  keyPoints: string[]
  instrucciones: string[]
  contenidoTecnico: Array<{ keyPoint: string; contenido: string }>
  imageFolder: string
}

const TYPE_LABELS: Record<string, string> = {
  explanation: 'Explicación',
  practice: 'Práctica',
  reflection: 'Reflexión',
  closing: 'Cierre',
}

const TYPE_COLORS: Record<string, string> = {
  explanation: 'bg-blue-100 text-blue-700',
  practice: 'bg-green-100 text-green-700',
  reflection: 'bg-purple-100 text-purple-700',
  closing: 'bg-amber-100 text-amber-700',
}

const SHOW_WHEN_OPTIONS = [
  { value: 'on_start', label: 'Al inicio' },
  { value: 'on_reference', label: 'Cuando la IA cite' },
  { value: 'on_demand', label: 'Si el estudiante pide' },
] as const

export function ResourceManager({
  lessonId,
  lessonTitle,
  courseId,
  courseTitle,
  activities,
  keyPoints,
  instrucciones,
  contenidoTecnico,
  imageFolder,
}: Props) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingActivityRef = useRef<string | null>(null)

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [describingFor, setDescribingFor] = useState<string | null>(null)

  const [images, setImages] = useState<ResourceImage[]>(() =>
    activities
      .filter((a) => a.teaching.image?.url)
      .map((a) => ({
        activityId: a.id,
        url: a.teaching.image!.url,
        fileName: a.teaching.image!.url.split('/').pop() || 'imagen',
        description: a.teaching.image!.description || '',
        showWhen: a.teaching.image!.showWhen || 'on_reference',
      }))
  )

  const getImage = (activityId: string) =>
    images.find((img) => img.activityId === activityId)

  const describeImage = async (activityId: string, imageUrl: string) => {
    setDescribingFor(activityId)
    try {
      const descRes = await fetch('/api/upload/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
        credentials: 'include',
      })
      if (descRes.ok) {
        const { description } = (await descRes.json()) as { description: string }
        if (description) {
          setImages((prev) =>
            prev.map((img) =>
              img.activityId === activityId ? { ...img, description } : img
            )
          )
        }
      }
    } catch {
      toast.error('No se pudo describir la imagen')
    } finally {
      setDescribingFor(null)
    }
  }

  const handleUploadClick = (activityId: string) => {
    pendingActivityRef.current = activityId
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const activityId = pendingActivityRef.current
    if (!file || !activityId) return

    if (fileInputRef.current) fileInputRef.current.value = ''
    pendingActivityRef.current = null

    setUploadingFor(activityId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', imageFolder)

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Error al subir imagen')
      }

      const { url } = (await res.json()) as { url: string }

      setImages((prev) => {
        const filtered = prev.filter((img) => img.activityId !== activityId)
        return [
          ...filtered,
          {
            activityId,
            url,
            fileName: file.name,
            description: '',
            showWhen: 'on_reference' as const,
          },
        ]
      })
      toast.success('Imagen subida')
      describeImage(activityId, url)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploadingFor(null)
    }
  }

  const updateImage = (activityId: string, updates: Partial<ResourceImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.activityId === activityId ? { ...img, ...updates } : img))
    )
  }

  const removeImage = (activityId: string) => {
    setImages((prev) => prev.filter((img) => img.activityId !== activityId))
  }

  const handleSave = async () => {
    const invalid = images.filter((img) => img.description.trim().length < 10)
    if (invalid.length > 0) {
      toast.error('Todas las imágenes necesitan una descripción (mínimo 10 caracteres)')
      return
    }

    const updatedActivities: Activity[] = activities.map((activity) => {
      const img = getImage(activity.id)
      if (img) {
        const image: TeachingImage = {
          url: img.url,
          description: img.description,
          showWhen: img.showWhen,
        }
        return { ...activity, teaching: { ...activity.teaching, image } }
      }
      const { image: _removed, ...teachingWithoutImage } = activity.teaching as Activity['teaching'] & { image?: TeachingImage }
      return { ...activity, teaching: teachingWithoutImage }
    })

    setIsSaving(true)
    try {
      const response = await fetch('/api/planner/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          keyPoints,
          contentJson: {
            activities: updatedActivities,
            instrucciones,
            contenidoTecnico,
          },
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Error al guardar')
      }

      toast.success('Recursos guardados')
      router.push(`/planner/${courseId}`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const assignedCount = images.length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Image lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <Link
        href={`/planner/${courseId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {courseTitle}
      </Link>

      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Recursos: {lessonTitle}</h1>
        <p className="text-sm text-gray-500">
          {assignedCount} de {activities.length} actividades con imagen
        </p>
      </div>

      {/* 3-column table */}
      <div className="overflow-hidden rounded-lg border bg-white">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_200px_1fr] border-b bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>Actividad</span>
          <span className="text-center">Imagen</span>
          <span>Configuración</span>
        </div>

        {/* Rows */}
        {activities.map((activity, index) => {
          const img = getImage(activity.id)
          const isUploading = uploadingFor === activity.id
          const typeLabel = TYPE_LABELS[activity.type] || activity.type
          const typeColor = TYPE_COLORS[activity.type] || 'bg-gray-100 text-gray-700'

          return (
            <div
              key={activity.id}
              className={`grid grid-cols-[1fr_200px_1fr] items-start gap-4 px-4 py-4 ${
                index < activities.length - 1 ? 'border-b' : ''
              }`}
            >
              {/* Col 1: Activity info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400">{index + 1}.</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                    {typeLabel}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {activity.teaching.agent_instruction}
                </p>
              </div>

              {/* Col 2: Image */}
              <div className="flex flex-col items-center gap-2">
                {img ? (
                  <>
                    <button
                      onClick={() => setPreviewImage(img.url)}
                      className="h-28 w-full overflow-hidden rounded-lg border bg-gray-100 cursor-zoom-in"
                    >
                      <img
                        src={img.url}
                        alt={img.fileName}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleUploadClick(activity.id)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                        disabled={isUploading}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Cambiar
                      </button>
                      <button
                        onClick={() => removeImage(activity.id)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                        Quitar
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleUploadClick(activity.id)}
                    className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-xs">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">Subir imagen</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Col 3: Config (description + showWhen) */}
              <div>
                {img ? (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">
                          Descripción para la IA *
                        </label>
                        {describingFor === activity.id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-600">
                            <Sparkles className="h-3 w-3 animate-pulse" />
                            Describiendo...
                          </span>
                        ) : (
                          <button
                            onClick={() => describeImage(activity.id, img.url)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-violet-600 hover:bg-violet-50"
                            title="Generar descripción con IA"
                          >
                            <Sparkles className="h-3 w-3" />
                            Describir con IA
                          </button>
                        )}
                      </div>
                      <textarea
                        value={img.description}
                        onChange={(e) => updateImage(activity.id, { description: e.target.value })}
                        placeholder="Describe qué muestra la imagen para que la IA la referencie..."
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-gray-600">Mostrar imagen:</span>
                      {SHOW_WHEN_OPTIONS.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <input
                            type="radio"
                            name={`showWhen-${activity.id}`}
                            value={value}
                            checked={img.showWhen === value}
                            onChange={() => updateImage(activity.id, { showWhen: value })}
                            className="h-3.5 w-3.5"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-gray-400">
                    Sin imagen asignada
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 mt-6 rounded-lg border bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {assignedCount > 0
              ? `${assignedCount} imagen${assignedCount > 1 ? 'es' : ''} asignada${assignedCount > 1 ? 's' : ''}`
              : 'Sin imágenes — puedes guardar así'}
          </p>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar Recursos'}
          </Button>
        </div>
      </div>
    </div>
  )
}
