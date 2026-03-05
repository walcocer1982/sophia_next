'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import type { KeyPointContenido } from '@/types/planner'

interface Props {
  value: KeyPointContenido[]
  isEditing: boolean
  onSave: (value: KeyPointContenido[]) => void
}

export function PanelSectionContenido({ value, isEditing, onSave }: Props) {
  const [draft, setDraft] = useState<KeyPointContenido[]>(value)

  if (value.length === 0 && !isEditing) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {draft.map((item, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs font-medium text-gray-500">{item.keyPoint}</p>
            <Textarea
              value={item.contenido}
              onChange={(e) => {
                const updated = [...draft]
                updated[i] = { ...updated[i], contenido: e.target.value }
                setDraft(updated)
              }}
              className="min-h-[40px] text-xs"
              rows={2}
            />
          </div>
        ))}
        <Button
          size="sm"
          className="h-6 text-xs"
          onClick={() => onSave(draft)}
        >
          <Check className="mr-1 h-3 w-3" /> Guardar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i}>
          <p className="text-xs font-medium text-gray-500">{item.keyPoint}</p>
          <p className="text-sm text-gray-600">{item.contenido}</p>
        </div>
      ))}
    </div>
  )
}
