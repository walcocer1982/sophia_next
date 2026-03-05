'use client'

import type { Activity } from '@/types/lesson'
import { Badge } from '@/components/ui/badge'

interface Props {
  value: Activity[]
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  explanation: { label: 'Explicación', className: 'bg-blue-100 text-blue-800' },
  practice: { label: 'Práctica', className: 'bg-green-100 text-green-800' },
  reflection: { label: 'Reflexión', className: 'bg-purple-100 text-purple-800' },
  closing: { label: 'Cierre', className: 'bg-amber-100 text-amber-800' },
}

export function PanelSectionEstructura({ value }: Props) {
  if (value.length === 0) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  return (
    <div className="space-y-1.5">
      {value.map((activity, i) => {
        const typeInfo = TYPE_CONFIG[activity.type] || TYPE_CONFIG.explanation
        return (
          <div
            key={activity.id}
            className="rounded border border-gray-200 bg-white p-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{i + 1}.</span>
              <Badge className={`${typeInfo.className} text-[10px] px-1.5 py-0`}>
                {typeInfo.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-gray-600 line-clamp-2">
              {activity.teaching.agent_instruction}
            </p>
          </div>
        )
      })}
      <p className="text-center text-xs text-gray-400">
        {value.length} actividades generadas
      </p>
    </div>
  )
}
