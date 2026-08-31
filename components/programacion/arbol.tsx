'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Building2, ChevronDown, ChevronRight, GraduationCap, Plus } from 'lucide-react'
import { useProgramacionCtx } from './contexto'
import type { CareerMini, Section } from './types'

/** Un curso llega a una carrera por su lista m:n, o por ser transversal. */
function sirveA(s: Section, careerId: string) {
  return s.course.scope === 'TRANSVERSAL' || s.course.careers.some((c) => c.id === careerId)
}

/** Programadas / total de sesiones de un conjunto de secciones. */
function avance(secciones: Section[]) {
  const hechas = secciones.reduce((n, s) => n + s.schedules.length, 0)
  const total = secciones.reduce((n, s) => n + s.course.lessons.length, 0)
  return { hechas, total }
}

function Contador({ hechas, total }: { hechas: number; total: number }) {
  if (total === 0) return null
  const completo = hechas >= total
  return (
    <span
      className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
        completo ? 'text-gray-400' : hechas === 0 ? 'bg-amber-50 text-amber-700' : 'text-gray-500'
      }`}
      title={`${hechas} de ${total} sesiones programadas`}
    >
      {hechas}/{total}
    </span>
  )
}

function Flecha({ abierto }: { abierto: boolean }) {
  const Icono = abierto ? ChevronDown : ChevronRight
  return <Icono className="h-3.5 w-3.5 shrink-0 text-gray-400" />
}

/**
 * Admisión ▸ Sede ▸ Carrera. Se detiene ahí a propósito: el curso transversal
 * sirve a todas las carreras, así que como nodo aparecía repetido y truncado
 * bajo cada una. Los cursos viven en el panel, una sola vez.
 */
export function Arbol() {
  const p = useProgramacionCtx()
  const pathname = usePathname()
  const [cerrados, setCerrados] = useState<Set<string>>(new Set())

  const alternar = (id: string) =>
    setCerrados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Las ramas nacen abiertas: con tres admisiones el árbol entero cabe en
  // pantalla, y lo que se busca es ver de un vistazo dónde falta programar.
  const abierto = (id: string) => !cerrados.has(id)

  const admisiones = useMemo(() => {
    if (!p.data) return []
    return p.data.periods.map((periodo) => {
      const suyas = p.data!.sections.filter((s) => s.periodId === periodo.id)
      const sedes = p.data!.sedes
        .map((sede) => {
          const deLaSede = suyas.filter((s) => s.sedeId === sede.id)
          const carreras = (sede.careers ?? [])
            .map((car: CareerMini) => ({
              ...car,
              secciones: deLaSede.filter((s) => sirveA(s, car.id)),
            }))
            .filter((c) => c.secciones.length > 0)
          return { ...sede, secciones: deLaSede, carreras }
        })
        .filter((s) => s.secciones.length > 0)
      return { ...periodo, sedes, secciones: suyas }
    })
  }, [p.data])

  if (p.loading) {
    return <div className="p-4 text-sm text-gray-500">Cargando…</div>
  }
  if (!p.data) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-gray-200 pl-4 pr-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admisiones</span>
        {p.data.canCreate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => p.setShowNewPeriod(true)}
            className="h-6 gap-1 px-1.5 text-xs text-gray-500"
            title="Nueva admisión"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 text-sm">
        {admisiones.map((adm) => (
          <div key={adm.id}>
            <button
              onClick={() => alternar(adm.id)}
              className="flex w-full items-center gap-1.5 py-2.5 pl-4 pr-3 text-left hover:bg-gray-200/60"
            >
              <Flecha abierto={abierto(adm.id)} />
              <span className="font-semibold text-gray-900">{adm.name}</span>
              {!adm.isActive && <span className="text-[11px] text-gray-400">cerrada</span>}
              <Contador {...avance(adm.secciones)} />
            </button>

            {abierto(adm.id) && adm.sedes.length === 0 && (
              <p className="py-1 pl-8 pr-3 text-xs text-gray-400">sin secciones</p>
            )}

            {abierto(adm.id) && adm.sedes.map((sede) => {
              const claveSede = `${adm.id}:${sede.id}`
              return (
                <div key={sede.id}>
                  <button
                    onClick={() => alternar(claveSede)}
                    className="flex w-full items-center gap-1.5 py-2.5 pl-8 pr-3 text-left hover:bg-gray-200/60"
                  >
                    <Flecha abierto={abierto(claveSede)} />
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="font-medium text-gray-800">{sede.code}</span>
                    <Contador {...avance(sede.secciones)} />
                  </button>

                  {abierto(claveSede) && sede.carreras.map((car) => {
                    const href = `/programacion/${encodeURIComponent(adm.name)}/${sede.code.toLowerCase()}/${car.slug ?? car.id}`
                    // Activa también cuando se está viendo un curso suyo.
                    const activo = pathname === href || pathname.startsWith(`${href}/`)
                    return (
                      <Link
                        key={car.id}
                        href={href}
                        className={`flex items-center gap-1.5 py-2.5 pl-[3.25rem] pr-3 ${
                          activo ? 'bg-indigo-100 font-medium text-indigo-900' : 'hover:bg-gray-200/60'
                        }`}
                      >
                        <GraduationCap
                          className={`h-3.5 w-3.5 shrink-0 ${activo ? 'text-indigo-600' : 'text-gray-400'}`}
                        />
                        <span className="truncate">{car.code ?? car.name}</span>
                        <Contador {...avance(car.secciones)} />
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
