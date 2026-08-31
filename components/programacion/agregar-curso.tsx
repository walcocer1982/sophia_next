'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, Plus, Sparkles, X } from 'lucide-react'
import type { RegularCourse } from './types'

interface Props {
  /** Cursos ya diseñados que sirven a esta carrera y todavía no están acá. */
  disponibles: RegularCourse[]
  onAgregar: (courseId: string) => Promise<void>
}

/**
 * Reemplaza al formulario de «Nueva sección». No pide nombre, ni sede, ni
 * admisión: todo eso lo da la rama donde estás parado. Solo se elige qué curso
 * —de los ya diseñados— se dicta acá.
 */
export function AgregarCurso({ disponibles, onAgregar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)

  if (disponibles.length === 0 && !abierto) {
    return (
      <span className="text-xs text-gray-400">
        Todos los cursos de esta carrera ya están programados
      </span>
    )
  }

  if (!abierto) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAbierto(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Agregar curso
      </Button>
    )
  }

  return (
    <div className="w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Cursos diseñados
        </span>
        <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {disponibles.map((c) => (
          <button
            key={c.id}
            disabled={ocupado !== null}
            onClick={async () => {
              setOcupado(c.id)
              await onAgregar(c.id)
              setOcupado(null)
              setAbierto(false)
            }}
            className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2.5 text-left hover:bg-indigo-50 disabled:opacity-50"
          >
            {ocupado === c.id ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-indigo-600" />
            ) : c.scope === 'TRANSVERSAL' ? (
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
            ) : (
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-900">{c.title}</span>
              <span className="text-xs text-gray-500">
                {c.scope === 'TRANSVERSAL'
                  ? 'Transversal — crea la sección vacía, los alumnos se eligen por DNI'
                  : 'Crea las secciones del padrón y matricula a sus alumnos'}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
