'use client'

import { useState } from 'react'
import { ChevronLeft, Target, Lightbulb, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface LearningSidebarProps {
  instructorName: string
  lessonTitle: string
  objective: string
  keyPoints: string[]
  progress: {
    current: number
    total: number
    percentage: number
  }
  isCollapsed: boolean
  onToggle: () => void
}

export function LearningSidebar({
  instructorName,
  lessonTitle,
  objective,
  keyPoints,
  progress,
  isCollapsed,
  onToggle,
}: LearningSidebarProps) {
  const [completedObjective, setCompletedObjective] = useState(false)

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shrink-0',
        isCollapsed ? 'w-0 overflow-hidden border-none' : 'w-[280px]'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Panel de Aprendizaje</h2>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Instructor Card */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center text-lg font-semibold">
            {instructorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{instructorName}</h4>
            <p className="text-xs text-gray-500">{lessonTitle}</p>
          </div>
        </div>

        {/* Objetivo */}
        <section>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-teal-600">
            <Target className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-900">Aprendizaje Esperado</h3>
          </div>
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => setCompletedObjective(!completedObjective)}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                completedObjective
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-gray-300 hover:border-teal-500'
              )}
            >
              {completedObjective && <span className="text-xs">✓</span>}
            </button>
            <p className="text-sm text-gray-700 leading-relaxed">{objective}</p>
          </div>
        </section>

        {/* Puntos Clave */}
        <section>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-teal-600">
            <Lightbulb className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-900">Puntos Clave</h3>
          </div>
          <div className="space-y-2">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-teal-600 font-semibold shrink-0">{index + 1}.</span>
                <span className="text-gray-700 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Progreso - Fixed at bottom */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <BarChart3 className="h-4 w-4" />
              <span>Progreso</span>
            </div>
            <span className="text-sm font-semibold text-teal-600">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Actividad {progress.current} de {progress.total}
          </p>
        </div>
      </div>
    </aside>
  )
}
