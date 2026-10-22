import { NIVEL_TEXTO, type ActividadDelReporte, type ReporteSesion } from '@/lib/reporte-sesion'
import type { RubricLevel } from '@/lib/rubric'

/**
 * El reporte de un alumno en una sesión, como lo lee el instructor: avance,
 * logro de aprendizaje por punto clave (con la escala oficial), fortalezas,
 * oportunidades de mejora y acciones. Los datos los arma lib/reporte-sesion.ts.
 */

const CHIP: Record<RubricLevel, string> = {
  logrado_destacado: 'bg-emerald-100 text-emerald-900',
  logrado: 'bg-emerald-50 text-emerald-700',
  en_proceso: 'bg-amber-50 text-amber-800',
  en_inicio: 'bg-red-50 text-red-700',
}

function Nivel({ nivel, extra }: { nivel: RubricLevel | null; extra?: string }) {
  if (!nivel) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{extra ?? 'Sin evaluar'}</span>
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[nivel]}`}>{NIVEL_TEXTO[nivel]}</span>
}

function Estado({ a }: { a: ActividadDelReporte }) {
  if (a.estado === 'sin_llegar') return <span className="text-xs text-gray-400">sin llegar</span>
  if (a.estado === 'en_curso') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">en curso</span>
  if (!a.evaluativa) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">sin nota</span>
  return <Nivel nivel={a.nivel} />
}

export function ReporteSesionView({ reporte, nombre }: { reporte: ReporteSesion; nombre: string }) {
  const { avance, logro, puntosClave, fortalezas, oportunidades, duda, acciones } = reporte
  const primerNombre = nombre.split(' ')[0]

  return (
    <div className="space-y-5 text-sm">
      {/* Avance y logro */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avance de la sesión</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {avance.hechas} de {avance.total} actividades
          </p>
          <p className="text-xs text-gray-500">
            {avance.conNotaHechas} de {avance.conNota} con nota · {avance.hechas - avance.conNotaHechas} de {avance.total - avance.conNota} sin nota
            {avance.terminada ? ' · terminó' : ' · no terminó'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Logro de aprendizaje</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {logro.puntosTotal ? `${logro.puntosLogrados} de ${logro.puntosTotal} puntos clave (${logro.porcentaje} %)` : 'Sin puntos clave con nota'}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span>Nivel de logro:</span>
            <Nivel nivel={logro.nivelSesion} extra="sin nota" />
            {logro.nota !== null && (
              <span>
                · Desempeño: {logro.notaVeinte} de 20{logro.parcial ? ' (parcial)' : ''}
              </span>
            )}
            <span>· Dominio de criterios: {logro.criteriosCubiertos} de {logro.criteriosTotal}</span>
            {logro.lecturasTotal > 0 && (
              <span>· Lectura comprobada: {logro.lecturasComprobadas} de {logro.lecturasTotal}</span>
            )}
          </p>
        </div>
      </div>

      {/* Por punto clave */}
      {puntosClave.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Nivel de logro por punto clave</p>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Punto clave</th>
                  <th className="px-3 py-2 font-medium">Nivel</th>
                  <th className="px-3 py-2 font-medium">Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {puntosClave.map((k) => (
                  <tr key={k.indice} className="align-top">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {k.indice + 1} · {k.titulo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Nivel nivel={k.nivel} extra={k.completo ? 'Sin evaluar' : 'Incompleto'} />
                      {!k.completo && k.nivel && <span className="ml-1 text-xs text-gray-400">incompleto</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <ul className="space-y-1">
                        {k.actividades.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-gray-500">Act {a.indice}</span>
                            <Estado a={a} />
                            {a.estado === 'completada' && a.evaluativa && (
                              <span className="text-xs text-gray-500">
                                {a.criterios.filter((c) => c.cubierto).length} de {a.criterios.length} criterios
                                {a.porLimite ? ' · por límite' : ''}
                                {a.intentos > 1 ? ` · ${a.intentos} intentos` : ''}
                                {a.lectura === 'comprobada' ? ' · tocó la línea' : a.lectura === 'sin_comprobar' ? ' · no tocó la línea' : ''}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Escala: En inicio · En proceso · Logrado · Destacado. Un punto clave toma el nivel más bajo de sus actividades con nota.
          </p>
        </div>
      )}

      {/* Fortalezas y oportunidades */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Fortalezas</p>
          {fortalezas.length === 0 ? (
            <p className="text-gray-500">Todavía ninguna actividad lograda.</p>
          ) : (
            <ul className="space-y-2">
              {fortalezas.map((f) => (
                <li key={f.actividad.id} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
                  <p className="text-gray-900">
                    <span className="font-medium">Act {f.actividad.indice} · {f.actividad.titulo}:</span> {f.texto}.
                  </p>
                  {f.cita && <p className="mt-1 text-xs italic text-gray-600">«{f.cita}»</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Oportunidades de mejora</p>
          {oportunidades.length === 0 && !duda ? (
            <p className="text-gray-500">Nada pendiente en esta sesión.</p>
          ) : (
            <ul className="space-y-2">
              {oportunidades.map((o) => (
                <li key={`${o.actividad.id}-${o.tipo}`} className="rounded-lg border border-red-100 bg-red-50/40 p-2.5">
                  <p className="text-gray-900">
                    <span className="font-medium">Act {o.actividad.indice} · {o.actividad.titulo}:</span> {o.texto}.
                  </p>
                  {o.falta.length > 0 && o.tipo === 'criterio' && (
                    <p className="mt-1 text-xs text-red-800">Falta: {o.falta.join(' · ')}</p>
                  )}
                  {o.tipo === 'criterio' && o.actividad.respuesta && (
                    <p className="mt-1 text-xs italic text-gray-600">Escribió: «{o.actividad.respuesta}»</p>
                  )}
                </li>
              ))}
              {duda && (
                <li className="rounded-lg border border-gray-200 p-2.5">
                  <p className="text-gray-900">
                    <span className="font-medium">Duda que dejó al cerrar:</span> «{duda}»
                  </p>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Acciones */}
      {acciones.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones con {primerNombre}</p>
          <ol className="list-decimal space-y-1 pl-5 text-gray-800">
            {acciones.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
