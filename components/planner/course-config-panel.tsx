'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type Methodology = 'REFLECTIVE' | 'CODE'

interface CourseConfig {
  methodology: Methodology
  voiceEnabled: boolean
  allowPaste: boolean
  allowImagePaste: boolean
  instructor: string
}

const METHODOLOGY_LABELS: Record<Methodology, string> = {
  REFLECTIVE: 'Reflexiva (socrática)',
  CODE: 'Código / instruccional',
}

export function CourseConfigPanel({
  courseId,
  initial,
}: {
  courseId: string
  initial: CourseConfig
}) {
  const [config, setConfig] = useState<CourseConfig>(initial)
  const [open, setOpen] = useState(false)
  const [instructorDraft, setInstructorDraft] = useState(initial.instructor)
  const { run, isPending } = useAsyncOp()
  const menuRef = useRef<HTMLDivElement>(null)
  const instructorDirty = instructorDraft.trim() !== config.instructor.trim()

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

  async function saveInstructor() {
    const next = instructorDraft.trim()
    if (next.length < 20) {
      toast.error('La personalidad debe tener al menos 20 caracteres')
      return
    }
    await patch({ instructor: next }, 'instructor')
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
          {/* Metodología */}
          <p className="mb-1.5 text-xs font-medium text-gray-700">Metodología del curso</p>
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
