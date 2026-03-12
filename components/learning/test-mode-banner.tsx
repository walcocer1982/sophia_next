'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FlaskConical, SkipForward, ListOrdered, RotateCcw, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Activity = {
  id: string
  type: string
  title: string
}

export function TestModeBanner({
  sessionId,
  courseId,
  activities,
}: {
  sessionId: string
  courseId: string
  activities: Activity[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showSkipTo, setShowSkipTo] = useState(false)

  const handleSkipActivity = async () => {
    setLoading('skip')
    try {
      // Get current activity from progress endpoint, then complete it
      const progressRes = await fetch(`/api/activity/progress?sessionId=${sessionId}`)
      if (!progressRes.ok) throw new Error()
      const progressData = await progressRes.json()

      if (!progressData.currentActivityId) {
        toast.error('No hay actividad actual')
        return
      }

      const res = await fetch('/api/activity/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          activityId: progressData.currentActivityId,
        }),
      })

      if (res.ok) {
        toast.success('Actividad saltada')
        // Force reload to get fresh state
        window.location.reload()
      } else {
        toast.error('Error al saltar actividad')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  const handleSkipTo = async (activityId: string) => {
    setLoading(activityId)
    try {
      const res = await fetch('/api/session/skip-to-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, activityId }),
      })

      if (res.ok) {
        toast.success('Saltando a actividad...')
        setShowSkipTo(false)
        window.location.reload()
      } else {
        toast.error('Error al saltar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  const handleReset = async () => {
    if (!confirm('¿Reiniciar la prueba? Se borrarán todos los mensajes y progreso.')) return

    setLoading('reset')
    try {
      // Delete this test session and redirect back to planner
      const res = await fetch('/api/session/skip-to-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          activityId: activities[0]?.id,
        }),
      })

      if (res.ok) {
        toast.success('Prueba reiniciada')
        window.location.reload()
      } else {
        toast.error('Error al reiniciar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  const handleExit = () => {
    router.push(`/planner/${courseId}`)
  }

  const typeLabel: Record<string, string> = {
    explanation: 'Explicación',
    practice: 'Práctica',
    reflection: 'Reflexión',
    closing: 'Cierre',
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <FlaskConical className="h-4 w-4" />
          Modo Prueba
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-amber-800 hover:bg-amber-100"
            onClick={handleSkipActivity}
            disabled={loading !== null}
          >
            {loading === 'skip' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
            Saltar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-amber-800 hover:bg-amber-100"
            onClick={() => setShowSkipTo(!showSkipTo)}
            disabled={loading !== null}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Ir a...
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-amber-800 hover:bg-amber-100"
            onClick={handleReset}
            disabled={loading !== null}
          >
            {loading === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reiniciar
          </Button>
          <div className="mx-1 h-4 w-px bg-amber-300" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-amber-800 hover:bg-amber-100"
            onClick={handleExit}
          >
            <X className="h-3.5 w-3.5" />
            Salir
          </Button>
        </div>
      </div>

      {/* Skip to activity dropdown */}
      {showSkipTo && (
        <div className="border-b border-amber-200 bg-amber-50/50 px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            {activities.map((activity, idx) => (
              <Button
                key={activity.id}
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => handleSkipTo(activity.id)}
                disabled={loading !== null}
              >
                {loading === activity.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="font-semibold">{idx + 1}.</span>
                )}
                {typeLabel[activity.type] || activity.type}: {activity.title.slice(0, 30)}{activity.title.length > 30 ? '...' : ''}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
