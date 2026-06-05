import { CalendarDays, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * /programacion — Placeholder. Próximamente:
 *  - Períodos académicos (2026-1, 2026-2...)
 *  - Por período: secciones por sede (ABQ / IRQ / FCHB / ENTER)
 *  - Por sección: estudiantes inscriptos, instructores asignados, calendario
 *    de lecciones (cuándo abre cada una)
 *
 * Hoy esta funcionalidad está dispersa en /admin (sections, periods) y en
 * /planner (schedule por lección). La idea es centralizar acá toda la
 * programación temporal y de audiencia (cuándo y a quién).
 */
export default function ProgramacionPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="h-7 w-7 text-instructor-600" />
          <h1 className="text-2xl font-bold text-gray-900">Programación</h1>
        </div>
        <p className="text-sm text-gray-600">
          Define cuándo y a quién se entregan los cursos.
        </p>
      </div>

      <Card className="p-8 text-center bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
        <Sparkles className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Próximamente
        </h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
          Acá vas a poder organizar los períodos académicos, las secciones por sede
          (ABQ, IRQ, FCHB, ENTER), inscribir estudiantes y programar la apertura
          de lecciones por sección.
        </p>
        <p className="text-xs text-gray-500">
          Por ahora, esa configuración vive en Config (Admin).
        </p>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">📅 Períodos</h3>
          <p className="text-xs text-gray-500">2026-1, 2026-2, etc.</p>
        </Card>
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">👥 Secciones</h3>
          <p className="text-xs text-gray-500">Por sede + período</p>
        </Card>
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">📆 Calendario</h3>
          <p className="text-xs text-gray-500">Apertura de lecciones por sección</p>
        </Card>
      </div>
    </div>
  )
}
