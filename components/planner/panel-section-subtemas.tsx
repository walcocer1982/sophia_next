'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Plus, X } from 'lucide-react'

interface Props {
  value: string[]
  isEditing: boolean
  onSave: (value: string[]) => void
}

export function PanelSectionSubtemas({ value, isEditing, onSave }: Props) {
  const [draft, setDraft] = useState<string[]>(value)

  if (value.length === 0 && !isEditing) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        {draft.map((item, i) => (
          <div key={i} className="flex gap-1">
            <Input
              value={item}
              onChange={(e) => {
                const updated = [...draft]
                updated[i] = e.target.value
                setDraft(updated)
              }}
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => setDraft([...draft, ''])}
          >
            <Plus className="mr-1 h-3 w-3" /> Agregar
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={() => onSave(draft.filter((s) => s.trim()))}
          >
            <Check className="mr-1 h-3 w-3" /> Guardar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-0.5">
      {value.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
          <span className="mt-0.5 text-xs text-gray-400">{i + 1}.</span>
          {item}
        </li>
      ))}
    </ul>
  )
}
