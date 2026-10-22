'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, SkipForward, ListOrdered, RotateCcw, X, Loader2, GraduationCap, PenTool } from 'lucide-react'
import { toast } from 'sonner'
import { urlDeLaPrueba } from '@/lib/vista-estudiante'

type Activity = {
  id: string
  type: string
  title: string
}

export function TestModeBanner({
  sessionId,
  courseId,
  activities,
  comoEstudiante = false,
}: {
  sessionId: string
  courseId: string
  activities: Activity[]
  /** «Probar como estudiante» (lib/vista-estudiante.ts): franja fina, solo íconos. */
  comoEstudiante?: boolean
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
        // La prueba actual queda guardada; se abre otra desde esa actividad (21 oct 2026).
        const { sessionId: nueva } = (await res.json()) as { sessionId: string }
        toast.success('Saltando a actividad...')
        setShowSkipTo(false)
        window.location.assign(`/learn/${nueva}${window.location.search}`)
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
    if (!confirm('¿Reiniciar la prueba? Esta queda guardada y empiezas otra desde el inicio.')) return

    setLoading('reset')
    try {
      // Cierra esta prueba y abre otra desde la primera actividad
      const res = await fetch('/api/session/skip-to-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          activityId: activities[0]?.id,
        }),
      })

      if (res.ok) {
        const { sessionId: nueva } = (await res.json()) as { sessionId: string }
        toast.success('Prueba reiniciada')
        window.location.assign(`/learn/${nueva}${window.location.search}`)
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

  // Cambiar de vista recarga la página: la vista decide qué material llega del
  // servidor y qué permisos tiene la caja de texto.
  const cambiarVista = () => {
    window.location.href = urlDeLaPrueba(sessionId, !comoEstudiante)
  }

  // Controles de la prueba EN LÍNEA, dentro de la barra de la lección (14 oct
  // 2026): antes eran una franja amarilla aparte, una tercera barra arriba.
  const boton = 'h-8 w-8 inline-flex items-center justify-center rounded-full text-[#f6d77a] hover:bg-[#fbc50b]/15 hover:text-[#fbc50b] disabled:opacity-40'
  return (
    <div className="relative">
      <div className="flex h-9 items-center gap-0.5 rounded-full border border-[#fbc50b]/30 bg-[#fbc50b]/10 pl-2.5 pr-1">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-[#f6d77a]" aria-hidden />
        <span className="mr-1 hidden whitespace-nowrap text-xs font-semibold text-[#f6d77a] xl:inline">
          {comoEstudiante ? 'Prueba · estudiante' : 'Prueba'}
        </span>
        <button
          type="button"
          className={boton}
          onClick={cambiarVista}
          aria-label={comoEstudiante ? 'Ver como instructor' : 'Ver como estudiante'}
          title={comoEstudiante ? 'Volver a la vista de instructor' : 'Ver la lección como la ve un alumno'}
        >
          {comoEstudiante ? <PenTool className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
        </button>
        <button type="button" className={boton} onClick={handleSkipActivity} aria-label="Saltar actividad" title="Saltar actividad" disabled={loading !== null}>
          {loading === 'skip' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
        </button>
        <button type="button" className={boton} onClick={() => setShowSkipTo(!showSkipTo)} aria-label="Ir a una actividad" title="Ir a una actividad" aria-expanded={showSkipTo} disabled={loading !== null}>
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={boton} onClick={handleReset} aria-label="Reiniciar la prueba" title="Reiniciar la prueba" disabled={loading !== null}>
          {loading === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        </button>
        <button type="button" className={boton} onClick={handleExit} aria-label="Salir de la prueba" title="Salir de la prueba">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Ir a una actividad */}
      {showSkipTo && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[60vh] w-[min(340px,90vw)] overflow-y-auto rounded-xl border border-white/10 bg-[#0d1f3c] p-1.5 shadow-2xl">
          {activities.map((activity, idx) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => handleSkipTo(activity.id)}
              disabled={loading !== null}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#e6edf1] hover:bg-white/5 disabled:opacity-50"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold">
                {loading === activity.id ? <Loader2 className="h-3 w-3 animate-spin" /> : idx + 1}
              </span>
              <span className="min-w-0">
                <span className="block leading-snug">{activity.title}</span>
                <span className="block text-[11px] text-[#7f909b]">{typeLabel[activity.type] || activity.type}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
