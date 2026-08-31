'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { PanelSesiones } from '@/components/programacion/panel-sesiones'
import { useProgramacionCtx } from '@/components/programacion/contexto'

export default function ProgramarCurso() {
  const params = useParams<{ periodo: string; sede: string; carrera: string; curso: string }>()
  const nombrePeriodo = decodeURIComponent(params.periodo)
  const codigoSede = decodeURIComponent(params.sede)
  const claveCarrera = decodeURIComponent(params.carrera)
  const cursoId = decodeURIComponent(params.curso)
  const p = useProgramacionCtx()

  const periodo = p.data?.periods.find((x) => x.name === nombrePeriodo) ?? null
  const sede = p.data?.sedes.find((x) => x.code.toLowerCase() === codigoSede.toLowerCase()) ?? null
  const carrera = sede?.careers?.find((c) => (c.slug ?? c.id) === claveCarrera) ?? null

  const secciones = useMemo(() => {
    if (!p.data || !periodo || !sede) return []
    return p.data.sections.filter(
      (s) => s.periodId === periodo.id && s.sedeId === sede.id && s.course.id === cursoId
    )
  }, [p.data, periodo, sede, cursoId])

  if (p.loading) {
    return <div className="p-8 text-sm text-gray-500">Cargando…</div>
  }
  if (!p.data) return null

  const curso = secciones[0]?.course ?? null
  const esTransversal = curso?.scope === 'TRANSVERSAL'

  // Con quién se comparte esta programación: un curso transversal se dicta una
  // sola vez, así que la fecha que se ponga acá vale también para las demás.
  const otrasCarreras = esTransversal
    ? (sede?.careers ?? []).filter((c) => c.id !== carrera?.id).map((c) => c.code ?? c.name)
    : []

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <span>{nombrePeriodo}</span>
        <span className="text-gray-300">/</span>
        <span>{sede?.code ?? codigoSede.toUpperCase()}</span>
        <span className="text-gray-300">/</span>
        <Link
          href={`/programacion/${encodeURIComponent(nombrePeriodo)}/${codigoSede}/${claveCarrera}`}
          className="hover:text-gray-900 hover:underline"
        >
          {carrera?.name ?? claveCarrera}
        </Link>
      </div>

      {!curso ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500">Este curso no tiene secciones en esta sede.</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{curso.title}</h2>
              <p className="mt-1.5 text-sm text-gray-600">
                {secciones.length} sección{secciones.length !== 1 ? 'es' : ''} en {sede?.code} ·{' '}
                {curso.lessons.length} sesiones en el plan
              </p>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={p.includeArchived}
                onChange={(e) => p.setIncludeArchived(e.target.checked)}
                className="rounded"
              />
              <span>Ver archivadas</span>
            </label>
          </div>

          {esTransversal && otrasCarreras.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
              <p className="text-sm text-purple-900">
                <strong>Curso transversal.</strong> La fecha y hora que pongas acá aplican también a{' '}
                {otrasCarreras.join(', ')} — es la misma sección, con los mismos estudiantes.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {secciones.map((sec) => (
              <PanelSesiones
                key={sec.id}
                section={sec}
                canEdit={p.data!.canCreate}
                onToggleLesson={p.handleToggleLesson}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
