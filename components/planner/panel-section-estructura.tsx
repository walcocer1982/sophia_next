'use client'

import type { Activity } from '@/types/lesson'

const TYPE_LABELS: Record<string, string> = {
  explanation: 'Explicación',
  practice: 'Práctica',
  reflection: 'Reflexión',
  closing: 'Cierre',
}

const TYPE_COLORS: Record<string, string> = {
  explanation: 'text-blue-600',
  practice: 'text-green-600',
  reflection: 'text-purple-600',
  closing: 'text-amber-600',
}

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple',
  moderate: 'Moderado',
  complex: 'Complejo',
}

interface Props {
  value: Activity[]
  keyPoints?: string[]
}

export function PanelSectionEstructura({ value, keyPoints = [] }: Props) {
  if (value.length === 0) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  return (
    <div className="space-y-1.5">
      {/* Activity count */}
      <div className="rounded-md bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-800">
        {value.length} actividades generadas
      </div>

      {/* Compact activity list */}
      {value.map((activity, i) => {
        const keyPoint = activity.keyPointIndex !== null
          ? (keyPoints[activity.keyPointIndex] || `Punto ${activity.keyPointIndex + 1}`)
          : 'Cierre general'
        const shortInstruction = activity.teaching.agent_instruction.length > 60
          ? activity.teaching.agent_instruction.slice(0, 60) + '...'
          : activity.teaching.agent_instruction

        return (
          <div
            key={activity.id}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-gray-400">{i + 1}/{value.length}</span>
              <span className={`font-medium ${TYPE_COLORS[activity.type] || ''}`}>
                {TYPE_LABELS[activity.type] || activity.type}
              </span>
              {activity.complexity && (
                <span className="text-[10px] text-gray-400">
                  · {COMPLEXITY_LABELS[activity.complexity]}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-gray-600 leading-tight">{shortInstruction}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Punto clave: {keyPoint}</p>
          </div>
        )
      })}

      {/* Hint */}
      <p className="text-center text-[10px] text-gray-400">
        Revisa preguntas y criterios en Verificación después de guardar
      </p>
    </div>
  )
}
