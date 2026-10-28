'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSondeo } from '@/hooks/use-sondeo'

interface ProgressData {
  current: number
  total: number
  percentage: number
  currentActivityId: string | null
  currentActivity: string
  lessonTitle: string
  lastCompletedId: string | null
  lastCompletedAt: string | null
  completedAt: string | null
  passed: boolean | null
}

interface ProgressContextValue {
  progress: ProgressData
  updateProgress: (data: Partial<ProgressData>) => void
}

const defaultProgress: ProgressData = {
  current: 1,
  total: 1,
  percentage: 0,
  currentActivityId: null,
  currentActivity: '',
  lessonTitle: '',
  lastCompletedId: null,
  lastCompletedAt: null,
  completedAt: null,
  passed: null,
}

const ProgressContext = createContext<ProgressContextValue>({
  progress: defaultProgress,
  updateProgress: () => {},
})

export function useProgress() {
  return useContext(ProgressContext)
}

/**
 * Single polling provider for activity progress.
 * Replaces 3 separate polling intervals (chat-interface 5s, learning-layout 3s, activity-progress-header 5s)
 * with ONE shared poll at 4s.
 */
export function ProgressProvider({
  sessionId,
  initialProgress,
  children,
}: {
  sessionId: string
  initialProgress?: Partial<ProgressData>
  children: React.ReactNode
}) {
  const [progress, setProgress] = useState<ProgressData>({
    ...defaultProgress,
    ...initialProgress,
  })
  const prevCompletedIdRef = useRef<string | null>(null)

  const updateProgress = useCallback((data: Partial<ProgressData>) => {
    setProgress((prev) => ({ ...prev, ...data }))
  }, [])

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/activity/progress?sessionId=${sessionId}`)
      if (!res.ok) return
      const data = await res.json()

      setProgress((prev) => ({
        ...prev,
        current: data.currentPosition ?? data.progress,
        total: data.total,
        percentage: data.percentage,
        currentActivityId: data.currentActivityId || null,
        currentActivity: data.currentActivity || '',
        lessonTitle: data.lessonTitle || prev.lessonTitle,
        lastCompletedId: data.lastCompleted?.activityId || null,
        lastCompletedAt: data.lastCompleted?.completedAt || null,
        // Una sesión no se «descompleta»: si el evento de la última actividad
        // ya la marcó y este sondeo llegó antes de que el servidor guardara
        // completedAt, se conserva (si no, la tarjeta de cierre parpadeaba).
        completedAt: data.completedAt || prev.completedAt,
        passed: data.passed ?? prev.passed,
      }))
    } catch {
      // Silently fail — progress will just be stale
    }
  }, [sessionId])

  // El avance llega al instante con cada respuesta del chat (onActivityCompleted);
  // el sondeo es solo un respaldo. Era cada 4 s, también con la pestaña oculta, y
  // no dejaba dormir la base (27 oct 2026). Ahora 30 s, solo a la vista, y nada
  // cuando la lección terminó.
  useSondeo(fetchProgress, progress.completedAt ? null : 30_000, { inmediato: true })

  // Track previous completed ID for change detection by consumers
  useEffect(() => {
    prevCompletedIdRef.current = progress.lastCompletedId
  }, [progress.lastCompletedId])

  return (
    <ProgressContext.Provider value={{ progress, updateProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}
