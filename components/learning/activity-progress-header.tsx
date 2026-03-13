'use client'

import { useProgress } from './progress-context'

export function ActivityProgressHeader() {
  const { progress } = useProgress()

  // Determinar color de la barra según progreso
  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // Mostrar mensaje de felicitación si está completada
  if (progress.completedAt && progress.passed) {
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
                  {progress.lessonTitle}
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
              {progress.lessonTitle}
            </p>
            <p className="text-sm text-gray-700 font-medium mt-0.5">
              {progress.currentActivity}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">Progreso</p>
            <p className="text-sm font-bold text-slate-800">
              {progress.current} de {progress.total} •{' '}
              {progress.percentage}%
            </p>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(progress.percentage)} transition-all duration-500 ease-out`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {progress.lastCompletedAt && (
          <p className="text-xs text-gray-400 mt-1.5">
            Última completada:{' '}
            {new Date(progress.lastCompletedAt).toLocaleTimeString(
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
