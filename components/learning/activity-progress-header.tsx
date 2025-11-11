'use client'

import { useState, useEffect } from 'react'
import { AI_CONFIG } from '@/lib/ai-config'

interface ActivityProgressData {
  sessionId: string
  lessonTitle: string
  currentActivity: string
  currentActivityId: string
  progress: number
  total: number
  percentage: number
  lastCompleted: {
    activityId: string
    completedAt: string
  } | null
  completedAt: string | null
  passed: boolean | null
}

interface ActivityProgressHeaderProps {
  sessionId: string
}

export function ActivityProgressHeader({
  sessionId,
}: ActivityProgressHeaderProps) {
  const [progressData, setProgressData] =
    useState<ActivityProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/activity/progress?sessionId=${sessionId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch progress')
        }

        const data: ActivityProgressData = await response.json()

        if (isMounted) {
          setProgressData(data)
          setIsLoading(false)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Error loading progress'
          )
          setIsLoading(false)
        }
      }
    }

    // Initial fetch
    fetchProgress()

    // Poll periodically (configured in AI_CONFIG)
    const interval = setInterval(fetchProgress, AI_CONFIG.polling.progressIntervalMs)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="bg-white border-b p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-b border-red-200 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!progressData) {
    return null
  }

  // Determinar color de la barra según progreso
  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // Mostrar mensaje de felicitación si está completada
  if (progressData.completedAt && progressData.passed) {
    return (
      <div className="bg-green-50 border-b border-green-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-medium text-green-800">
                  ¡Lección completada!
                </p>
                <p className="text-xs text-green-600">
                  {progressData.lessonTitle}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-green-700">100%</span>
          </div>

          <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-full transition-all duration-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {progressData.lessonTitle}
            </p>
            <p className="text-sm text-gray-700 font-medium mt-0.5">
              {progressData.currentActivity}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">Progreso</p>
            <p className="text-sm font-bold text-slate-800">
              {progressData.progress} de {progressData.total} •{' '}
              {progressData.percentage}%
            </p>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(progressData.percentage)} transition-all duration-500 ease-out`}
            style={{ width: `${progressData.percentage}%` }}
          />
        </div>

        {progressData.lastCompleted && (
          <p className="text-xs text-gray-400 mt-1.5">
            Última completada:{' '}
            {new Date(progressData.lastCompleted.completedAt).toLocaleTimeString(
              'es-PE',
              {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }
            )}
          </p>
        )}
      </div>
    </div>
  )
}
