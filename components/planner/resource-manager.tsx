'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, Loader2, Save, Sparkles, Plus, ImageIcon, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Activity, TeachingImage } from '@/types/lesson'

interface ResourceImage {
  id: string // unique id per image
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

let imageIdCounter = 0
function generateImageId() {
  return `img-${Date.now()}-${++imageIdCounter}`
}

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
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)

  // Initialize from existing data — supports both image (singular) and images (array)
  const [images, setImages] = useState<ResourceImage[]>(() => {
    const result: ResourceImage[] = []
    for (const a of activities) {
      const existing = a.teaching.images || (a.teaching.image ? [a.teaching.image] : [])
      for (const img of existing) {
        if (img.url) {
          result.push({
            id: generateImageId(),
            activityId: a.id,
            url: img.url,
            fileName: img.url.split('/').pop() || 'imagen',
            description: img.description || '',
            showWhen: img.showWhen || 'on_reference',
          })
        }
      }
    }
    return result
  })

  const getImages = (activityId: string) =>
    images.filter((img) => img.activityId === activityId)

  const [relevanceWarnings, setRelevanceWarnings] = useState<Record<string, string>>({})

  const describeImage = async (imageId: string, imageUrl: string, activityId?: string) => {
    setDescribingFor(imageId)
    try {
      // Find suggestions for this activity to validate relevance
      const activity = activityId ? activities.find((a) => a.id === activityId) : null
      const suggestions = activity?.teaching.image_suggestions || []
      const expectedContent = suggestions.length > 0 ? suggestions.join('. ') : undefined

      const descRes = await fetch('/api/upload/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, expectedContent }),
        credentials: 'include',
      })
      if (descRes.ok) {
        const { description, isRelevant, relevanceNote } = (await descRes.json()) as {
          description: string
          isRelevant: boolean | null
          relevanceNote: string | null
        }
        if (description) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageId ? { ...img, description } : img
            )
          )
        }
        if (isRelevant === false && relevanceNote) {
          setRelevanceWarnings((prev) => ({ ...prev, [imageId]: relevanceNote }))
          toast.warning(`Imagen posiblemente no relevante: ${relevanceNote}`)
        } else {
          setRelevanceWarnings((prev) => {
            const next = { ...prev }
            delete next[imageId]
            return next
          })
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
      const newId = generateImageId()

      setImages((prev) => [
        ...prev,
        {
          id: newId,
          activityId,
          url,
          fileName: file.name,
          description: '',
          showWhen: 'on_reference' as const,
        },
      ])
      toast.success('Imagen subida')
      describeImage(newId, url, activityId)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploadingFor(null)
    }
  }

  const updateImage = (imageId: string, updates: Partial<ResourceImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, ...updates } : img))
    )
  }

  const removeImage = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  const handleSave = async () => {
    const invalid = images.filter((img) => img.description.trim().length < 10)
    if (invalid.length > 0) {
      toast.error('Todas las imágenes necesitan una descripción (mínimo 10 caracteres)')
      return
    }

    const updatedActivities: Activity[] = activities.map((activity) => {
      const actImages = getImages(activity.id)
      const teachingImages: TeachingImage[] = actImages.map((img) => ({
        url: img.url,
        description: img.description,
        showWhen: img.showWhen,
      }))

      // Save as images[] (new format) + image (backward compat with first image)
      const { image: _old, images: _oldArr, ...teachingClean } = activity.teaching as Activity['teaching'] & { image?: TeachingImage; images?: TeachingImage[] }

      if (teachingImages.length > 0) {
        return {
          ...activity,
          teaching: {
            ...teachingClean,
            images: teachingImages,
            image: teachingImages[0], // backward compat
          },
        }
      }
      return { ...activity, teaching: teachingClean }
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

  const totalImages = images.length
  const activitiesWithImages = new Set(images.map((i) => i.activityId)).size

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
          {totalImages} imagen{totalImages !== 1 ? 'es' : ''} en {activitiesWithImages} de {activities.length} actividades
        </p>
      </div>

      {/* Activity rows */}
      <div className="space-y-2">
        {activities.map((activity, index) => {
          const actImages = getImages(activity.id)
          const isUploading = uploadingFor === activity.id
          const typeLabel = TYPE_LABELS[activity.type] || activity.type
          const typeColor = TYPE_COLORS[activity.type] || 'bg-gray-100 text-gray-700'
          const isExpanded = expandedActivity === activity.id
          const suggestions = activity.teaching.image_suggestions || []

          return (
            <div key={activity.id} className="overflow-hidden rounded-lg border bg-white">
              {/* Row: activity left, images right */}
              <div className="flex">
                {/* Left: activity info (~60%) */}
                <div className="flex-1 border-r px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400">{index + 1}.</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                      {typeLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-gray-600 line-clamp-2">
                    {activity.teaching.agent_instruction}
                  </p>
                </div>

                {/* Right: image zone (~40%) */}
                <div className="flex w-[320px] shrink-0 flex-col gap-2 border-l px-4 py-3">
                  {/* Image suggestions from AI */}
                  {suggestions.length > 0 && actImages.length === 0 && (
                    <div className="space-y-1">
                      {suggestions.map((s, si) => (
                        <div key={si} className="flex items-start gap-1.5 text-xs text-amber-700">
                          <ImageIcon className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {actImages.length > 0 ? (
                    <>
                      {/* Thumbnails row */}
                      <div className="flex items-center gap-2">
                        {actImages.map((img) => (
                          <button
                            key={img.id}
                            onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
                          >
                            <img src={img.url} alt={img.fileName} className="h-full w-full object-cover" />
                          </button>
                        ))}
                        <button
                          onClick={() => handleUploadClick(activity.id)}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {/* Show remaining suggestions */}
                      {suggestions.length > actImages.length && (
                        <p className="text-xs text-amber-600">
                          Faltan {suggestions.length - actImages.length} imagen{suggestions.length - actImages.length > 1 ? 'es' : ''} sugerida{suggestions.length - actImages.length > 1 ? 's' : ''}
                        </p>
                      )}
                      <button
                        onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                        className="text-xs text-gray-400 hover:text-blue-500"
                      >
                        {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleUploadClick(activity.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 py-3 text-sm text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-50"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Subir imagen
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: image details */}
              {isExpanded && actImages.length > 0 && (
                <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                  {actImages.map((img, imgIdx) => (
                    <div key={img.id} className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <button
                        onClick={() => setPreviewImage(img.url)}
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white cursor-zoom-in"
                      >
                        <img src={img.url} alt={img.fileName} className="h-full w-full object-cover" />
                      </button>

                      {/* Config */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">
                            Imagen {imgIdx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            {describingFor === img.id ? (
                              <span className="inline-flex items-center gap-1 text-xs text-violet-600">
                                <Sparkles className="h-3 w-3 animate-pulse" />
                                Describiendo...
                              </span>
                            ) : (
                              <button
                                onClick={() => describeImage(img.id, img.url)}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-violet-600 hover:bg-violet-50"
                              >
                                <Sparkles className="h-3 w-3" />
                                IA
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(img.id)}
                              className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={img.description}
                          onChange={(e) => updateImage(img.id, { description: e.target.value })}
                          placeholder="Descripción para la IA..."
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
                          rows={2}
                        />
                        {relevanceWarnings[img.id] && (
                          <div className="flex items-start gap-1.5 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{relevanceWarnings[img.id]}</span>
                          </div>
                        )}
                        <div className="flex gap-3">
                          {SHOW_WHEN_OPTIONS.map(({ value, label }) => (
                            <label key={value} className="flex items-center gap-1 text-xs text-gray-500">
                              <input
                                type="radio"
                                name={`showWhen-${img.id}`}
                                value={value}
                                checked={img.showWhen === value}
                                onChange={() => updateImage(img.id, { showWhen: value })}
                                className="h-3 w-3"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 mt-6 rounded-lg border bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {totalImages > 0
              ? `${totalImages} imagen${totalImages > 1 ? 'es' : ''} en ${activitiesWithImages} actividad${activitiesWithImages > 1 ? 'es' : ''}`
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
