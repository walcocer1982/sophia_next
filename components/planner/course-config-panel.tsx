'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Loader2, Check, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type Methodology = 'REFLECTIVE' | 'CODE'
type Track = 'REGULAR' | 'CONTINUA'

interface SedeOption {
  id: string
  code: string
  name: string
}

interface CourseConfig {
  title: string
  capacidad: string | null
  methodology: Methodology
  track: Track
  sedeIds: string[]  // ids de las sedes asignadas al curso
  voiceEnabled: boolean
  allowPaste: boolean
  allowImagePaste: boolean
  instructor: string
}

const METHODOLOGY_LABELS: Record<Methodology, string> = {
  REFLECTIVE: 'Reflexiva (socrática)',
  CODE: 'Código / instruccional',
}

const TRACK_LABELS: Record<Track, string> = {
  REGULAR: 'Regular (con sección + período)',
  CONTINUA: 'Continua (eventos / kioskos)',
}

export function CourseConfigPanel({
  courseId,
  initial,
  availableSedes,
}: {
  courseId: string
  initial: CourseConfig
  availableSedes: SedeOption[]
}) {
  const router = useRouter()
  const [config, setConfig] = useState<CourseConfig>(initial)
  const [open, setOpen] = useState(false)
  const [instructorDraft, setInstructorDraft] = useState(initial.instructor)
  const [titleDraft, setTitleDraft] = useState(initial.title)
  const [capacidadDraft, setCapacidadDraft] = useState(initial.capacidad ?? '')
  const { run, isPending } = useAsyncOp()
  const menuRef = useRef<HTMLDivElement>(null)
  const instructorDirty = instructorDraft.trim() !== config.instructor.trim()
  const titleDirty = titleDraft.trim() !== config.title.trim()
  const capacidadDirty = capacidadDraft.trim() !== (config.capacidad ?? '').trim()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function patch(partial: Partial<CourseConfig>, key: string) {
    const result = await run(
      () =>
        apiFetch<{ course: CourseConfig }>('/api/planner/course/update-config', {
          method: 'POST',
          json: { courseId, ...partial },
        }),
      { key }
    )
    if (!result) return
    setConfig((prev) => ({ ...prev, ...partial }))
    toast.success('Configuración actualizada')
  }

  function toggleSede(sedeId: string) {
    const isOn = config.sedeIds.includes(sedeId)
    const nextIds = isOn
      ? config.sedeIds.filter((id) => id !== sedeId)
      : [...config.sedeIds, sedeId]
    patch({ sedeIds: nextIds }, `sede-${sedeId}`)
  }

  async function saveInstructor() {
    const next = instructorDraft.trim()
    if (next.length < 20) {
      toast.error('La personalidad debe tener al menos 20 caracteres')
      return
    }
    await patch({ instructor: next }, 'instructor')
  }

  async function saveInfo() {
    const nextTitle = titleDraft.trim()
    if (nextTitle.length < 3) {
      toast.error('El título debe tener al menos 3 caracteres')
      return
    }
    const nextCap = capacidadDraft.trim()
    const payload: Partial<CourseConfig> = {}
    if (titleDirty) payload.title = nextTitle
    if (capacidadDirty) payload.capacidad = nextCap || null
    if (Object.keys(payload).length === 0) return
    await patch(payload, 'info')
    // Refrescar el header de la página (Server Component) sin recarga completa
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        <Settings className="h-3.5 w-3.5" />
        Configuración
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-h-[80vh] overflow-y-auto">
          {/* Información del curso (título + descripción) */}
          <p className="mb-1.5 text-xs font-medium text-gray-700">Información del curso</p>
          <div className="mb-3 space-y-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Título</label>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                maxLength={200}
                className="text-sm"
                placeholder="Nombre del curso"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Descripción</label>
              <textarea
                value={capacidadDraft}
                onChange={(e) => setCapacidadDraft(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Competencia general que desarrolla el curso"
                className="w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 text-xs leading-snug focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{capacidadDraft.length} / 2000</p>
            </div>
            {(titleDirty || capacidadDirty) && (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(config.title)
                    setCapacidadDraft(config.capacidad ?? '')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Descartar
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveInfo}
                  disabled={isPending('info') || titleDraft.trim().length < 3}
                >
                  {isPending('info') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            )}
          </div>

          {/* Track (Regular vs Continua) */}
          <p className="mb-1.5 text-xs font-medium text-gray-700 border-t border-gray-100 pt-2">Track del curso</p>
          <div className="mb-3 space-y-1">
            {(['REGULAR', 'CONTINUA'] as Track[]).map((t) => (
              <button
                key={t}
                onClick={() => t !== config.track && patch({ track: t }, 'track')}
                disabled={isPending('track')}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                  config.track === t
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                {TRACK_LABELS[t]}
                {config.track === t && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          {/* Sedes (multi-select) */}
          <div className="mb-3 border-t border-gray-100 pt-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Sedes donde se ofrece
              </p>
              <span className="text-[10px] text-gray-400">
                {config.sedeIds.length} de {availableSedes.length}
              </span>
            </div>
            <p className="mb-2 text-[10px] leading-snug text-gray-500">
              Marca las sedes donde se dicta este curso. Los CONTINUA pueden no tener ninguna (delivery itinerante via eventos).
            </p>
            {availableSedes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No hay sedes creadas. Crealas en Config → Sedes.</p>
            ) : (
              <div className="space-y-0.5">
                {availableSedes.map((sede) => {
                  const isOn = config.sedeIds.includes(sede.id)
                  const loading = isPending(`sede-${sede.id}`)
                  return (
                    <button
                      key={sede.id}
                      onClick={() => !loading && toggleSede(sede.id)}
                      disabled={loading}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                        isOn ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <code className="font-mono font-semibold">{sede.code}</code>
                        <span className="text-gray-500">{sede.name}</span>
                      </span>
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : isOn ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Metodología */}
          <p className="mb-1.5 text-xs font-medium text-gray-700 border-t border-gray-100 pt-2">Metodología pedagógica</p>
          <div className="mb-3 space-y-1">
            {(['REFLECTIVE', 'CODE'] as Methodology[]).map((m) => (
              <button
                key={m}
                onClick={() => m !== config.methodology && patch({ methodology: m }, 'methodology')}
                disabled={isPending('methodology')}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                  config.methodology === m
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                {METHODOLOGY_LABELS[m]}
                {config.methodology === m && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-2">
            <ToggleRow
              label="Voz de Sophia"
              checked={config.voiceEnabled}
              loading={isPending('voiceEnabled')}
              onChange={(v) => patch({ voiceEnabled: v }, 'voiceEnabled')}
            />
            <ToggleRow
              label="Permitir pegar texto"
              checked={config.allowPaste}
              loading={isPending('allowPaste')}
              onChange={(v) => patch({ allowPaste: v }, 'allowPaste')}
            />
            <ToggleRow
              label="Permitir pegar imágenes"
              checked={config.allowImagePaste}
              loading={isPending('allowImagePaste')}
              onChange={(v) => patch({ allowImagePaste: v }, 'allowImagePaste')}
            />
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">Personalidad de Sophia</p>
              <span className="text-[10px] text-gray-400">{instructorDraft.length} chars</span>
            </div>
            <p className="mb-2 text-[11px] leading-snug text-gray-500">
              Define cómo se presenta y enseña Sophia en este curso (tono, dominio, herramientas que conoce). Se inyecta en el system prompt de cada sesión.
            </p>
            <textarea
              value={instructorDraft}
              onChange={(e) => setInstructorDraft(e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder="Eres Sophia, instructora …"
              className="w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 font-mono text-xs leading-snug focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              {instructorDirty && (
                <button
                  type="button"
                  onClick={() => setInstructorDraft(config.instructor)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Descartar
                </button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={saveInstructor}
                disabled={!instructorDirty || isPending('instructor')}
              >
                {isPending('instructor') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  loading,
  onChange,
}: {
  label: string
  checked: boolean
  loading: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
      {label}
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
      ) : (
        <span
          className={`inline-flex h-4 w-7 items-center rounded-full px-0.5 transition-colors ${
            checked ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </span>
      )}
    </button>
  )
}
