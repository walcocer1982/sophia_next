'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Activity = {
  id: string
  type: string
  title: string
}

export function TestLessonButton({
  lessonId,
  activities,
}: {
  lessonId: string
  activities: Activity[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleStart = async (startFromActivity?: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          isTest: true,
          startFromActivity,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(`/learn/${data.sessionId}`)
      } else {
        toast.error(data.error || 'Error al iniciar prueba')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const typeLabel: Record<string, string> = {
    explanation: 'Explicación',
    practice: 'Práctica',
    reflection: 'Reflexión',
    closing: 'Cierre',
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        disabled={activities.length === 0}
        title={activities.length === 0 ? 'Diseña la sesión primero' : undefined}
      >
        <Play className="h-3.5 w-3.5" />
        Probar
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div
        className="mx-4 w-full max-w-md rounded-lg border bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold">Probar sesión</h3>
        <p className="mb-4 text-sm text-gray-500">
          Elige desde qué actividad iniciar la prueba
        </p>

        <div className="mb-4 max-h-64 space-y-1.5 overflow-y-auto">
          {activities.map((activity, idx) => (
            <button
              key={activity.id}
              onClick={() => setSelectedId(activity.id)}
              className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
                selectedId === activity.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <span className="font-medium">{activity.title}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {typeLabel[activity.type] || activity.type}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => { setOpen(false); setSelectedId(null) }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => handleStart(selectedId || undefined)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {selectedId ? 'Iniciar desde aquí' : 'Iniciar desde el inicio'}
          </Button>
        </div>
      </div>
    </div>
  )
}
