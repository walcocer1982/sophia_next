'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Props {
  value: string
  isEditing: boolean
  onSave: (value: string) => void
}

export function PanelSectionTema({ value, isEditing, onSave }: Props) {
  const [draft, setDraft] = useState(value)

  if (!value && !isEditing) {
    return <p className="text-xs text-gray-400 italic">Pendiente</p>
  }

  if (isEditing) {
    return (
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 text-xs"
          autoFocus
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => onSave(draft)}
          disabled={!draft.trim()}
        >
          <Check className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return <p className="text-sm text-gray-600">{value}</p>
}
