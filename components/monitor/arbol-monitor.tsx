'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react'
import { enlaceRama, type NodoAdmision, type Seleccion } from '@/lib/monitor-arbol'

/**
 * Admisión ▸ Sede ▸ Carrera, con el mismo molde que el árbol de Programación.
 * Cada nodo lleva cuántos necesitan atención (rojo) o, si nadie, cuántos
 * alumnos tiene. Las ramas nacen abiertas.
 */

function Flecha({ abierto }: { abierto: boolean }) {
  const Icono = abierto ? ChevronDown : ChevronRight
  return <Icono className="h-3.5 w-3.5 shrink-0 text-gray-400" />
}

function Contador({ enRiesgo, alumnos }: { enRiesgo: number; alumnos: number }) {
  if (enRiesgo > 0) {
    return (
      <span className="ml-auto shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700" title={`${enRiesgo} necesitan atención`}>
        {enRiesgo}
      </span>
    )
  }
  return (
    <span className="ml-auto shrink-0 font-mono text-[11px] text-gray-400" title={`${alumnos} estudiantes`}>
      {alumnos}
    </span>
  )
}

export function ArbolMonitor({ admisiones, seleccion }: { admisiones: NodoAdmision[]; seleccion: Seleccion }) {
  const [cerrados, setCerrados] = useState<Set<string>>(new Set())
  const alternar = (id: string) =>
    setCerrados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const abierto = (id: string) => !cerrados.has(id)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b border-gray-200 pl-4 pr-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admisiones</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 text-sm">
        {admisiones.length === 0 && <p className="px-4 py-2 text-xs text-gray-400">Sin secciones a tu alcance</p>}
        {admisiones.map((adm) => (
          <div key={adm.id}>
            <button onClick={() => alternar(adm.id)} className="flex w-full items-center gap-1.5 py-2.5 pl-4 pr-3 text-left hover:bg-gray-200/60">
              <Flecha abierto={abierto(adm.id)} />
              <span className="font-semibold text-gray-900">{adm.name}</span>
              {!adm.isActive && <span className="text-[11px] text-gray-400">cerrada</span>}
              <Contador enRiesgo={adm.enRiesgo} alumnos={adm.alumnos} />
            </button>

            {abierto(adm.id) &&
              adm.sedes.map((sede) => {
                const claveSede = `${adm.id}:${sede.id}`
                return (
                  <div key={sede.id}>
                    <button onClick={() => alternar(claveSede)} className="flex w-full items-center gap-1.5 py-2.5 pl-8 pr-3 text-left hover:bg-gray-200/60">
                      <Flecha abierto={abierto(claveSede)} />
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="font-medium text-gray-800">{sede.code}</span>
                      <Contador enRiesgo={sede.enRiesgo} alumnos={sede.alumnos} />
                    </button>

                    {abierto(claveSede) &&
                      sede.carreras.map((car) => {
                        const sel = { admision: adm.id, sede: sede.id, carrera: car.id }
                        const activo = seleccion.admision === adm.id && seleccion.sede === sede.id && seleccion.carrera === car.id
                        return (
                          <Link
                            key={car.id}
                            href={enlaceRama(sel)}
                            className={`flex items-center gap-1.5 py-2.5 pl-[3.25rem] pr-3 ${activo ? 'bg-indigo-100 font-medium text-indigo-900' : 'hover:bg-gray-200/60'}`}
                          >
                            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            <span className="truncate" title={car.name}>
                              {car.code ?? car.name}
                            </span>
                            <Contador enRiesgo={car.enRiesgo} alumnos={car.alumnos} />
                          </Link>
                        )
                      })}
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
