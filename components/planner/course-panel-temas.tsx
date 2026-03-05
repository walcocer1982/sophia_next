'use client'

import { useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CourseTema } from '@/types/planner'

interface CoursePanelTemasProps {
  value: CourseTema[]
  isEditing: boolean
  onSave: (value: CourseTema[]) => void
}

export function CoursePanelTemas({ value, isEditing, onSave }: CoursePanelTemasProps) {
  const [draft, setDraft] = useState<CourseTema[]>(value)

  if (!isEditing) {
    if (value.length === 0) {
      return <p className="text-xs text-gray-400 italic">Pendiente</p>
    }

    return (
      <ol className="space-y-1.5 text-xs">
        {value.map((tema, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 font-medium text-gray-500">{i + 1}.</span>
            <div>
              <p className="font-medium text-gray-700">{tema.titulo}</p>
              <p className="text-gray-400">{tema.objetivo}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  const addTema = () => {
    setDraft([...draft, { titulo: '', objetivo: '' }])
  }

  const removeTema = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index))
  }

  const updateTema = (index: number, field: keyof CourseTema, val: string) => {
    setDraft(
      draft.map((t, i) => (i === index ? { ...t, [field]: val } : t))
    )
  }

  const handleSave = () => {
    const valid = draft.filter((t) => t.titulo.trim() && t.objetivo.trim())
    if (valid.length > 0) onSave(valid)
  }

  return (
    <div className="space-y-2">
      {draft.map((tema, i) => (
        <div key={i} className="flex items-start gap-1 rounded border border-gray-200 bg-white p-2">
          <GripVertical className="mt-1 h-3 w-3 shrink-0 text-gray-300" />
          <div className="flex-1 space-y-1">
            <Input
              value={tema.titulo}
              onChange={(e) => updateTema(i, 'titulo', e.target.value)}
              placeholder="Nombre del tema"
              className="h-7 text-xs"
            />
            <Input
              value={tema.objetivo}
              onChange={(e) => updateTema(i, 'objetivo', e.target.value)}
              placeholder="Objetivo de aprendizaje"
              className="h-7 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => removeTema(i)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addTema}>
          <Plus className="mr-1 h-3 w-3" />
          Agregar
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
          Guardar
        </Button>
      </div>
    </div>
  )
}
