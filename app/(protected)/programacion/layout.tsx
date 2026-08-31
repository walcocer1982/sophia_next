'use client'

import { Arbol } from '@/components/programacion/arbol'
import { ProgramacionProvider, useProgramacionCtx } from '@/components/programacion/contexto'
import { NewPeriodModal } from '@/components/programacion/modals'

/**
 * Mismo molde que Monitor y Diseño: bloque centrado `max-w-7xl` con `p-8` y el
 * encabezado al nivel de la página. Antes esta pantalla iba a sangre y el árbol
 * quedaba pegado al borde del navegador, así que se leía como otra aplicación.
 *
 * Dentro, dos columnas: árbol para ubicarse (admisión ▸ sede ▸ carrera) y panel
 * para trabajar. Las sesiones NO son nodos del árbol — poner cinco fechas serían
 * cinco clicks; van en tabla, en el panel.
 */
function Marco({ children }: { children: React.ReactNode }) {
  const p = useProgramacionCtx()

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programación</h1>
        <p className="mt-1 text-sm text-gray-500">Cuándo y a quién se entrega cada curso</p>
      </div>

      <div className="flex h-[calc(100vh-15rem)] min-h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <aside className="w-60 shrink-0 overflow-hidden border-r border-gray-200 bg-gray-100">
          <Arbol />
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* «Nueva sección» ya no existe: el nombre se escribía a mano y de ahí
          salieron «Junio», «Presencial/Híbrido» y «Tutoría». Ahora las secciones
          nacen de «Agregar curso», dentro de la carrera. */}
      <NewPeriodModal
        open={p.showNewPeriod}
        onOpenChange={p.setShowNewPeriod}
        onCreated={p.refetch}
      />
    </div>
  )
}

export default function ProgramacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProgramacionProvider>
      <Marco>{children}</Marco>
    </ProgramacionProvider>
  )
}
