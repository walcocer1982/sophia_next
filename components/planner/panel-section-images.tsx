'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Activity } from '@/types/lesson'

export interface UploadedImage {
  id: string
  url: string
  fileName: string
  description: string
  activityId: string
  showWhen: 'on_start' | 'on_reference' | 'on_demand'
}

interface Props {
  activities: Activity[]
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  folder?: string
  disabled?: boolean
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

export function PanelSectionImages({
  activities,
  images,
  onChange,
  folder = 'sophia/general',
  disabled = false,
}: Props) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingActivityRef = useRef<string | null>(null)

  const getImageForActivity = (activityId: string) =>
    images.find((img) => img.activityId === activityId)

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
      formData.append('folder', folder)

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

      // Remove existing image for this activity (replace)
      const filtered = images.filter((img) => img.activityId !== activityId)

      const newImage: UploadedImage = {
        id: `img-${Date.now()}`,
        url,
        fileName: file.name,
        description: '',
        activityId,
        showWhen: 'on_reference',
      }

      onChange([...filtered, newImage])
      toast.success('Imagen subida')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploadingFor(null)
    }
  }

  const updateImage = (id: string, updates: Partial<UploadedImage>) => {
    onChange(images.map((img) => (img.id === id ? { ...img, ...updates } : img)))
  }

  const removeImage = (activityId: string) => {
    onChange(images.filter((img) => img.activityId !== activityId))
  }

  if (activities.length === 0) {
    return <p className="text-xs text-gray-400 italic">Genera actividades primero</p>
  }

  const assignedCount = activities.filter((a) => getImageForActivity(a.id)).length

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Summary */}
      <p className="text-[10px] text-gray-400">
        {assignedCount} de {activities.length} actividades con imagen
      </p>

      {/* Activity slots */}
      {activities.map((activity, index) => {
        const img = getImageForActivity(activity.id)
        const isUploading = uploadingFor === activity.id
        const typeLabel = TYPE_LABELS[activity.type] || activity.type
        const typeColor = TYPE_COLORS[activity.type] || 'bg-gray-100 text-gray-700'
        const shortTitle = activity.teaching.agent_instruction.length > 50
          ? activity.teaching.agent_instruction.slice(0, 50) + '...'
          : activity.teaching.agent_instruction

        return (
          <div
            key={activity.id}
            className="rounded border border-gray-200 bg-white p-2 space-y-2"
          >
            {/* Activity header */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400">{index + 1}.</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColor}`}>
                {typeLabel}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-gray-500">
                {shortTitle}
              </span>
            </div>

            {img ? (
              /* ── Has image ── */
              <>
                <div className="flex items-start gap-2">
                  <div className="h-14 w-14 shrink-0 rounded overflow-hidden bg-gray-100 border">
                    <img
                      src={img.url}
                      alt={img.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] text-gray-500 truncate">{img.fileName}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUploadClick(activity.id)}
                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100 transition-colors"
                        disabled={disabled || isUploading}
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Cambiar
                      </button>
                      <button
                        onClick={() => removeImage(activity.id)}
                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 transition-colors"
                        disabled={disabled}
                      >
                        <X className="h-2.5 w-2.5" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500">
                    Descripción para la IA *
                  </label>
                  <textarea
                    value={img.description}
                    onChange={(e) => updateImage(img.id, { description: e.target.value })}
                    placeholder="Describe qué muestra la imagen para que la IA la referencie..."
                    className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none resize-none"
                    rows={2}
                    disabled={disabled}
                  />
                </div>

                {/* showWhen */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-gray-500">Mostrar:</span>
                  {([
                    { value: 'on_start', label: 'Inicio' },
                    { value: 'on_reference', label: 'Referencia' },
                    { value: 'on_demand', label: 'A pedido' },
                  ] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1 text-[10px] text-gray-600">
                      <input
                        type="radio"
                        name={`showWhen-${img.id}`}
                        value={value}
                        checked={img.showWhen === value}
                        onChange={() => updateImage(img.id, { showWhen: value })}
                        className="h-3 w-3"
                        disabled={disabled}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              /* ── No image ── */
              <button
                onClick={() => handleUploadClick(activity.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-gray-300 py-2 text-[10px] text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                disabled={disabled || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3" />
                    Subir imagen
                  </>
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
