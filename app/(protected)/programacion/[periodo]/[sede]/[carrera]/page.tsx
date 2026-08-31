'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertTriangle, ChevronRight, Sparkles } from 'lucide-react'
import { useProgramacionCtx } from '@/components/programacion/contexto'
import { avisosDe } from '@/components/programacion/avisos'
import { AgregarCurso } from '@/components/programacion/agregar-curso'
import type { Section } from '@/components/programacion/types'

interface CursoFila {
  id: string
  title: string
  transversal: boolean
  secciones: Section[]
  estudiantes: number
  programadas: number
  total: number
  choques: number
  archivadas: number
}

export default function CursosDeLaCarrera() {
  const params = useParams<{ periodo: string; sede: string; carrera: string }>()
  const nombrePeriodo = decodeURIComponent(params.periodo)
  const codigoSede = decodeURIComponent(params.sede)
  const claveCarrera = decodeURIComponent(params.carrera)
  const p = useProgramacionCtx()

  const periodo = p.data?.periods.find((x) => x.name === nombrePeriodo) ?? null
  const sede = p.data?.sedes.find((x) => x.code.toLowerCase() === codigoSede.toLowerCase()) ?? null
  const carrera = sede?.careers?.find((c) => (c.slug ?? c.id) === claveCarrera) ?? null

  const cursos = useMemo<CursoFila[]>(() => {
    if (!p.data || !periodo || !sede || !carrera) return []

    // Un curso llega a esta carrera por su lista m:n, o por ser transversal.
    const suyas = p.data.sections.filter(
      (s) =>
        s.periodId === periodo.id &&
        s.sedeId === sede.id &&
        (s.course.scope === 'TRANSVERSAL' || s.course.careers.some((c) => c.id === carrera.id))
    )

    const mapa = new Map<string, CursoFila>()
    for (const s of suyas) {
      const actual = mapa.get(s.course.id) ?? {
        id: s.course.id,
        title: s.course.title,
        transversal: s.course.scope === 'TRANSVERSAL',
        secciones: [],
        estudiantes: 0,
        programadas: 0,
        total: 0,
        choques: 0,
        archivadas: 0,
      }
      actual.secciones.push(s)
      actual.estudiantes += s.enrolledCount
      actual.programadas += s.schedules.length
      actual.total += s.course.lessons.length
      if (s.isArchived) actual.archivadas += 1
      for (const l of s.course.lessons) {
        const sched = s.schedules.find((x) => x.lessonId === l.id)
        const avisos = avisosDe(l, sched, s.schedules, s.course.lessons)
        if (avisos.some((a) => a.tipo === 'choque')) actual.choques += 1
      }
      mapa.set(s.course.id, actual)
    }
    // Cada choque se cuenta dos veces (una por cada sesión del par).
    for (const c of mapa.values()) c.choques = Math.floor(c.choques / 2)

    return Array.from(mapa.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [p.data, periodo, sede, carrera])

  // Se ofrecen solo los cursos que sirven a esta carrera y que todavía no se
  // dictan acá — así no se puede crear una combinación imposible.
  const yaEstan = new Set(cursos.map((c) => c.id))
  const disponibles = !p.data || !carrera
    ? []
    : p.data.regularCourses.filter(
        (c) =>
          !yaEstan.has(c.id) &&
          (c.scope === 'TRANSVERSAL' || c.careers.some((x) => x.id === carrera.id))
      )

  if (p.loading) {
    return <div className="p-8 text-sm text-gray-500">Cargando…</div>
  }
  if (!p.data) return null

  const base = `/programacion/${encodeURIComponent(nombrePeriodo)}/${codigoSede}/${claveCarrera}`

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span>{nombrePeriodo}</span>
        <span className="text-gray-300">/</span>
        <span>{sede?.code ?? codigoSede.toUpperCase()}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{carrera?.name ?? claveCarrera}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {cursos.length} curso{cursos.length !== 1 ? 's' : ''} en {sede?.code} · elige uno para programar sus sesiones
          </p>
        </div>
        {p.data.canCreate && periodo && sede && carrera && (
          <AgregarCurso
            disponibles={disponibles}
            onAgregar={(courseId) =>
              p.handleAgregarCurso(courseId, periodo.id, sede.id, carrera.id)
            }
          />
        )}
      </div>

      {cursos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            {carrera
              ? 'No hay cursos con secciones para esta carrera en esta sede.'
              : `La carrera «${claveCarrera}» no se dicta en esta sede.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {cursos.map((c) => {
            const pct = c.total > 0 ? Math.round((c.programadas / c.total) * 100) : 0
            return (
              <Link key={c.id} href={`${base}/${c.id}`} className="group block">
                <div className="flex items-center gap-6 rounded-xl border border-gray-200 p-5 shadow-sm transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-50/30">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-semibold text-gray-900">{c.title}</h3>
                      {c.transversal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          <Sparkles className="h-3 w-3" />
                          Transversal
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>
                        {c.secciones.length === 1
                          ? `Sección ${c.secciones[0].name}`
                          : `${c.secciones.length} secciones`}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span>{c.estudiantes} estudiantes</span>
                      <span className="text-gray-300">·</span>
                      <span>{c.total} sesiones</span>
                      {c.archivadas > 0 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {c.archivadas === c.secciones.length ? 'archivadas' : `${c.archivadas} archivada${c.archivadas !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      {c.programadas === 0 ? (
                        <span className="text-sm font-medium text-amber-700">ninguna programada</span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          <strong className="text-gray-900">{c.programadas}</strong> de {c.total} programadas
                        </span>
                      )}
                    </div>
                  </div>

                  {c.choques > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      {c.choques} choque{c.choques !== 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 group-hover:text-indigo-500" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
