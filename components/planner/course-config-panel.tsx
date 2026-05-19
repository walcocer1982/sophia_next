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
  const { run, isPending } = useAsyncOp()
  const menuRef = useRef<HTMLDivElement>(null)

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
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
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
