'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

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

  useEffect(() => {
    const fetchProgress = async () => {
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
          completedAt: data.completedAt || null,
          passed: data.passed ?? null,
        }))
      } catch {
        // Silently fail — progress will just be stale
      }
    }

    fetchProgress()
    const interval = setInterval(fetchProgress, 4000)
    return () => clearInterval(interval)
  }, [sessionId])

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
