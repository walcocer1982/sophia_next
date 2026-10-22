import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { cargarReporteDeClase } from '@/lib/reporte-clase-datos'
import { SIN_REFUERZO } from '@/lib/reporte-clase-ia'
import { formatTime } from '@/lib/formatters'
import { Migas } from '@/components/programacion/breadcrumb'
import { TerminarBloque } from '@/components/monitor/terminar-bloque'
import { RedaccionIA } from '@/components/monitor/redaccion-ia'

export const dynamic = 'force-dynamic'

/**
 * El reporte de la sesión para una sección (22 oct 2026): lo que el instructor
 * mira en los 15 minutos después del bloque con Sophia. Arriba, los números
 * calculados (la suma de los reportes por alumno); abajo, la redacción de la IA
 * sobre lo que el código eligió reforzar. Aquí vive también el botón para
 * terminar el bloque.
 */
export default async function ReporteDeClasePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const rol = session.user.role
  if (rol !== 'ADMIN' && rol !== 'SUPERADMIN' && rol !== 'INSTRUCTOR') redirect('/lessons')

  const { courseId } = await params
  const q = await searchParams
  const lessonId = typeof q.leccion === 'string' ? q.leccion : null
  const sectionId = typeof q.seccion === 'string' ? q.seccion : null
  const { alcance } = await alcanceEfectivo(session)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)

  // Sin sección o sin sesión elegidas: se eligen acá.
  if (!lessonId || !sectionId) {
    const curso = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { title: true } })
    if (!curso) notFound()
    const secciones = await prisma.section.findMany({
      where: { AND: [{ courseId, isArchived: false }, filtro] },
      select: {
        id: true,
        name: true,
        period: { select: { name: true } },
        sede: { select: { code: true } },
        schedules: { select: { lessonId: true, lesson: { select: { order: true, title: true } } }, orderBy: { lesson: { order: 'asc' } } },
      },
      orderBy: { name: 'asc' },
    })
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <Migas items={[{ label: 'Monitor', href: '/dashboard' }, { label: curso.title, href: `/dashboard/${courseId}/matriz` }, { label: 'Reporte de la sesión' }]} />
        <h1 className="text-2xl font-bold tracking-tight">¿Qué sección y qué sesión?</h1>
        {secciones.length === 0 ? (
          <p className="text-sm text-gray-500">No hay secciones de este curso a tu alcance.</p>
        ) : (
          <div className="space-y-3">
            {secciones.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-gray-900">
                  {s.name} <span className="text-sm font-normal text-gray-500">· {s.sede?.code ?? '—'} · {s.period.name}</span>
                </p>
                {s.schedules.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">Sin sesiones programadas.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.schedules.map((h) => (
                      <Link
                        key={h.lessonId}
                        href={`/dashboard/${courseId}/clase?leccion=${h.lessonId}&seccion=${s.id}`}
                        className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      >
                        S{h.lesson.order} · {h.lesson.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const datos = await cargarReporteDeClase({ courseId, lessonId, sectionId, filtro })
  if (!datos) notFound()
  const { curso, leccion, seccion, clase } = datos
  const r = clase.resumen

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Migas
            items={[
              { label: 'Monitor', href: '/dashboard' },
              { label: curso.title, href: `/dashboard/${courseId}/matriz?seccion=${seccion.id}` },
              { label: `S${leccion.order} · ${leccion.title}` },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight">Reporte de la sesión</h1>
          <p className="text-sm text-gray-500">
            S{leccion.order} · {leccion.title} · {seccion.name} · {seccion.sede ?? '—'} · {seccion.periodo}
          </p>
        </div>
        <Link href={`/dashboard/${courseId}`} className="text-sm font-medium text-blue-600 hover:underline">
          Ver en vivo →
        </Link>
      </div>

      {/* El bloque de Sophia: cuándo cierra y el botón del instructor */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">Bloque con Sophia</p>
          <p className="text-xs text-gray-500">
            {r.entraron} de {r.matriculados} entraron · {r.terminaron} terminaron · {r.enCurso} en curso · {r.loDejaron} lo dejaron
            {r.cerraronSinTerminar > 0 && ` · ${r.cerraronSinTerminar} cerraron sin terminar`}
            {r.noEntraron > 0 && ` · ${r.noEntraron} no entraron`}
          </p>
        </div>
        <TerminarBloque
          courseId={courseId}
          sectionId={seccion.id}
          lessonId={leccion.id}
          cierre={seccion.tieneHorario && seccion.cierre ? formatTime(seccion.cierre) : null}
          cerradoPorInstructor={seccion.cerradoPorInstructor}
          abierta={seccion.abierta}
        />
      </section>

      {/* Logro por punto clave */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Logro de aprendizaje por punto clave</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Punto clave</th>
                <th className="px-4 py-2 text-left font-medium">Clase</th>
                <th className="px-4 py-2 text-right font-medium">Logrado o más</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clase.puntosClave.map((p) => {
                const total = Math.max(p.total, 1)
                const seg = [
                  { n: p.destacado, c: 'bg-emerald-600', t: 'Destacado' },
                  { n: p.logrado, c: 'bg-emerald-400', t: 'Logrado' },
                  { n: p.enProceso, c: 'bg-amber-400', t: 'En proceso' },
                  { n: p.enInicio, c: 'bg-red-400', t: 'En inicio' },
                  { n: p.incompleto, c: 'bg-gray-300', t: 'Incompleto' },
                  { n: p.sinLlegar, c: 'bg-gray-200', t: 'Sin llegar' },
                ]
                const logrados = p.destacado + p.logrado
                return (
                  <tr key={p.indice}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.indice + 1} · {p.titulo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100" title={seg.map((s) => `${s.t}: ${s.n}`).join(' · ')}>
                        {seg.map((s) => (s.n > 0 ? <div key={s.t} className={s.c} style={{ width: `${(s.n / total) * 100}%` }} /> : null))}
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">{seg.filter((s) => s.n > 0).map((s) => `${s.t} ${s.n}`).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {logrados} de {p.total}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Qué reforzar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Qué reforzar en los 15 minutos</h2>
        {clase.queReforzar.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">{SIN_REFUERZO}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {clase.queReforzar.map((c) => (
                <li key={`${c.actividadIndice}-${c.criterio}`} className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">
                      {c.alumnos.length} de {c.llegaron} que llegaron
                    </span>{' '}
                    no cubrieron «{c.criterio}»
                    <span className="text-gray-500">
                      {' '}
                      · Act {c.actividadIndice} · {c.actividadTitulo}
                      {c.puntoClave ? ` · ${c.puntoClave}` : ''}
                    </span>
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs italic text-gray-600">
                    {c.alumnos
                      .filter((a) => a.cita)
                      .slice(0, 3)
                      .map((a) => (
                        <li key={a.userId}>«{a.cita}»</li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
            <RedaccionIA courseId={courseId} lessonId={leccion.id} sectionId={seccion.id} />
          </>
        )}
        {(clase.porLimite.length > 0 || clase.lecturaSinComprobar.length > 0) && (
          <p className="text-xs text-gray-500">
            {clase.porLimite.length > 0 && `Avanzaron por límite: ${clase.porLimite.map((p) => `${p.nombre} (Act ${p.actividadIndice})`).join(', ')}. `}
            {clase.lecturaSinComprobar.length > 0 && `Lectura sin comprobar: ${clase.lecturaSinComprobar.map((l) => `${l.nombre} (Act ${l.actividadIndice})`).join(', ')}.`}
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dudas del cierre */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Dudas que dejaron al cerrar</h2>
          {clase.dudas.length === 0 ? (
            <p className="text-sm text-gray-500">Nadie dejó una duda.</p>
          ) : (
            <ul className="space-y-2">
              {clase.dudas.map((d) => (
                <li key={d.userId} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
                  <span className="font-medium text-gray-900">{d.nombre}:</span> «{d.texto}»
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* A quién mirar */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">A quién mirar</h2>
          {clase.aQuienMirar.length === 0 ? (
            <p className="text-sm text-gray-500">Nadie con señales individuales.</p>
          ) : (
            <ul className="space-y-2">
              {clase.aQuienMirar.map((m) => (
                <li key={m.userId} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
                  <Link href={`/dashboard/${courseId}/${m.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {m.nombre}
                  </Link>
                  <span className="text-gray-600"> · {m.motivo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Alumnos */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Alumnos</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Alumno</th>
                <th className="px-4 py-2 text-left font-medium">Estado</th>
                <th className="px-4 py-2 text-left font-medium">Avance</th>
                <th className="px-4 py-2 text-left font-medium">Nivel de logro</th>
                <th className="px-4 py-2 text-left font-medium">Desempeño</th>
                <th className="px-4 py-2 text-left font-medium">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clase.alumnos.map((a) => (
                <tr key={a.userId} className={a.reporte ? '' : 'text-gray-400'}>
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/${courseId}/${a.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {a.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{a.estado}</td>
                  <td className="px-4 py-2 tabular-nums">{a.avance}</td>
                  <td className="px-4 py-2">{a.nivel}</td>
                  <td className="px-4 py-2 tabular-nums">{a.desempeno}</td>
                  <td className="px-4 py-2 text-gray-600">{a.participacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">
          Los números salen del reporte de cada alumno, con la misma escala: En inicio · En proceso · Logrado · Destacado. La redacción de la IA solo usa el material de la sesión y los criterios de arriba.
        </p>
      </section>
    </div>
  )
}
