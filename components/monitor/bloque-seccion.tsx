import Link from 'next/link'
import { formatTime } from '@/lib/formatters'
import { SIN_REFUERZO } from '@/lib/reporte-clase-ia'
import type { DatosReporteClase } from '@/lib/reporte-clase-datos'
import { TerminarBloque } from '@/components/monitor/terminar-bloque'
import { RedaccionIA } from '@/components/monitor/redaccion-ia'

/**
 * Los puntos de repaso de una sección, dentro de la matriz (22 oct 2026).
 * Solo cuando el bloque cerró: los puntos de repaso (qué reforzar, con citas y la redacción
 * de la IA) y el logro por punto clave, con enlace al reporte completo.
 */
export function BloqueSeccion({ courseId, datos }: { courseId: string; datos: DatosReporteClase }) {
  const { leccion, seccion, clase } = datos
  const r = clase.resumen
  const reporte = `/dashboard/${courseId}/clase?leccion=${leccion.id}&seccion=${seccion.id}`
  const cierre = seccion.cierre ? formatTime(seccion.cierre) : null
  const titulo = `S${leccion.order} · ${leccion.title} · ${seccion.name}`

  // Con la ventana abierta no se muestra nada aquí: el botón para terminar va
  // en el encabezado de la matriz, junto a «Ver en vivo» (22 oct 2026, Walther).
  if (seccion.abierta) return null

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Puntos de repaso</p>
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <p className="text-xs text-gray-500">
            {seccion.cerradoPorInstructor ? 'Bloque terminado por el instructor' : 'Bloque cerrado'}
            {cierre && ` a las ${cierre}`} · {r.entraron} de {r.matriculados} entraron · {r.terminaron} terminaron
          </p>
        </div>
        <div className="flex items-center gap-3">
          {seccion.cerradoPorInstructor && (
            <TerminarBloque courseId={courseId} sectionId={seccion.id} lessonId={leccion.id} cierre={cierre} cerradoPorInstructor abierta={false} />
          )}
          <Link href={reporte} className="text-sm font-medium text-blue-600 hover:underline">
            Reporte completo →
          </Link>
        </div>
      </div>

      {/* Logro por punto clave, compacto */}
      <div className="grid gap-2 sm:grid-cols-3">
        {clase.puntosClave.map((p) => {
          const total = Math.max(p.total, 1)
          const logrados = p.destacado + p.logrado
          return (
            <div key={p.indice} className="rounded-lg bg-gray-50 p-3">
              <p className="truncate text-xs font-medium text-gray-700" title={p.titulo}>
                {p.indice + 1} · {p.titulo}
              </p>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="bg-emerald-500" style={{ width: `${(logrados / total) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(p.enProceso / total) * 100}%` }} />
                <div className="bg-red-400" style={{ width: `${(p.enInicio / total) * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {logrados} de {p.total} logrado o más
                {p.enInicio + p.enProceso > 0 && ` · ${p.enInicio + p.enProceso} por debajo`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Qué reforzar */}
      {clase.queReforzar.length === 0 ? (
        <p className="text-sm text-gray-600">{SIN_REFUERZO}</p>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {clase.queReforzar.map((c) => (
              <li key={`${c.actividadIndice}-${c.criterio}`} className="rounded-lg border border-red-100 bg-red-50/40 p-3 text-sm">
                <p className="text-gray-900">
                  <span className="font-semibold">
                    {c.alumnos.length} de {c.llegaron}
                  </span>{' '}
                  no cubrieron «{c.criterio}»<span className="text-gray-500"> · Act {c.actividadIndice}</span>
                </p>
                {c.alumnos.find((a) => a.cita) && <p className="mt-1 text-xs italic text-gray-600">«{c.alumnos.find((a) => a.cita)!.cita}»</p>}
              </li>
            ))}
          </ul>
          <RedaccionIA courseId={courseId} lessonId={leccion.id} sectionId={seccion.id} />
        </div>
      )}

      {clase.aQuienMirar.length > 0 && (
        <p className="text-xs text-gray-500">
          A quién mirar: {clase.aQuienMirar.map((m) => m.nombre).join(', ')} ·{' '}
          <Link href={reporte} className="text-blue-600 hover:underline">
            motivos en el reporte
          </Link>
        </p>
      )}
    </section>
  )
}
