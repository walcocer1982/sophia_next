'use client'

import { CalendarDays } from 'lucide-react'
import { useProgramacionCtx } from '@/components/programacion/contexto'

export default function ProgramacionInicio() {
  const p = useProgramacionCtx()

  const sinProgramar = p.data
    ? p.data.sections.filter((s) => s.schedules.length === 0).length
    : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <CalendarDays className="h-9 w-9 text-gray-300" />
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-gray-900">Elige una carrera</h2>
        <p className="max-w-sm text-sm text-gray-600">
          En el árbol de la izquierda: admisión, sede y carrera. Ahí se agregan los cursos y se les pone fecha.
        </p>
      </div>
      {sinProgramar > 0 && (
        <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          {sinProgramar} sección{sinProgramar !== 1 ? 'es' : ''} sin ninguna sesión programada
        </p>
      )}
    </div>
  )
}
