'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Props {
  value: string
  isEditing: boolean
  onSave: (value: string) => void
}

export function PanelSectionObjetivo({ value, isEditing, onSave }: Props) {
  const [draft, setDraft] = useState(value)

  if (!value && !isEditing) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  if (isEditing) {
    return (
      <div className="space-y-1.5">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60px] text-xs"
          rows={3}
          autoFocus
        />
        <Button
          size="sm"
          className="h-6 text-xs"
          onClick={() => onSave(draft)}
          disabled={!draft.trim()}
        >
          <Check className="mr-1 h-3 w-3" /> Guardar
        </Button>
      </div>
    )
  }

  return <p className="text-sm text-gray-600">{value}</p>
}
