import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { matrizDelCurso, pesoDeFila, type Matriz } from '@/lib/asistencia'
import { formatTime } from '@/lib/formatters'
import {
  armarArbol,
  claveGrupo,
  enlaceRama,
  ramaDe,
  seleccionDe,
  unicaRama,
  type SeccionDelArbol,
} from '@/lib/monitor-arbol'
import { ArbolMonitor } from '@/components/monitor/arbol-monitor'
import { Migas } from '@/components/programacion/breadcrumb'

export const dynamic = 'force-dynamic'

/**
 * Monitor — la portada.
 *
 * Se recorre como Programación: admisión ▸ sede ▸ carrera en el árbol de la
 * izquierda y, a la derecha, los cursos de esa rama con cuántos necesitan
 * atención (21 oct 2026). Antes era una lista de todos los cursos al alcance,
 * mezclados; al superadmin le salían juntas SI 1 y la sección de práctica.
 * Lo de «en vivo» sigue arriba, porque no espera a que se elija nada.
 */
export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const rol = session.user.role
  if (rol !== 'ADMIN' && rol !== 'SUPERADMIN' && rol !== 'INSTRUCTOR') redirect('/lessons')

  const { alcance } = await alcanceEfectivo(session)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const ahora = new Date()

  const secciones = await prisma.section.findMany({
    where: { AND: [{ isArchived: false }, { course: { deletedAt: null } }, filtro] },
    select: {
      id: true,
      name: true,
      period: { select: { id: true, name: true, isActive: true } },
      sede: { select: { id: true, code: true, careers: { select: { id: true, name: true, code: true } } } },
      course: {
        select: { id: true, title: true, scope: true, careers: { select: { id: true, name: true, code: true } } },
      },
      _count: { select: { enrollments: true } },
      schedules: { select: { lessonId: true, availableAt: true, closesAfterHours: true } },
    },
  })

  // «En vivo» solo si de verdad hay una ventana abierta ahora mismo.
  const abiertas = secciones.flatMap((s) =>
    s.schedules
      .filter((h) => {
        if (!h.availableAt) return false
        const cierra = new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000)
        return h.availableAt <= ahora && ahora < cierra
      })
      .map((h) => ({
        seccion: s,
        cierra: new Date(h.availableAt!.getTime() + h.closesAfterHours * 3_600_000),
      }))
  )

  // Una matriz por (curso, admisión, sede): de ahí salen «cuántos necesitan
  // atención» para el árbol y las tarjetas, con la misma regla que ordena la
  // matriz (lo que quedó con la ventana cerrada; los que desertaron no se llaman).
  const grupos = new Map<string, { courseId: string; periodId: string; sedeId: string | null }>()
  for (const s of secciones) {
    grupos.set(claveGrupo(s), { courseId: s.course.id, periodId: s.period.id, sedeId: s.sede?.id ?? null })
  }
  const matrices = new Map<string, { matriz: Matriz; enRiesgo: number }>(
    await Promise.all(
      [...grupos].map(async ([clave, g]) => {
        const matriz = await matrizDelCurso(g.courseId, { AND: [filtro, { periodId: g.periodId, sedeId: g.sedeId }] }, ahora)
        const enRiesgo = matriz.alumnos.filter((a) => !a.desertor && pesoDeFila(a) > 0).length
        return [clave, { matriz, enRiesgo }] as const
      })
    )
  )
  const enRiesgoPorGrupo = new Map([...matrices].map(([k, v]) => [k, v.enRiesgo]))

  const deArbol: SeccionDelArbol[] = secciones.map((s) => ({
    id: s.id,
    name: s.name,
    alumnos: s._count.enrollments,
    period: s.period,
    sede: s.sede,
    course: s.course,
  }))
  const arbol = armarArbol(deArbol, enRiesgoPorGrupo)
  const pedida = seleccionDe(await searchParams)
  // El instructor con una sola carrera no tiene nada que elegir: entra directo.
  const seleccion = pedida.carrera ? pedida : (unicaRama(arbol) ?? pedida)
  const rama = ramaDe(arbol, seleccion)

  // Los cursos de la rama, cada uno con las secciones que le tocan.
  const horarios = new Map(secciones.map((s) => [s.id, s.schedules]))
  const cursosDeRama = rama
    ? [...new Set(rama.carrera.secciones.map((s) => s.course.id))].map((id) => {
        const sus = rama.carrera.secciones.filter((s) => s.course.id === id)
        const grupo = matrices.get(claveGrupo(sus[0]))!
        const programadas = new Set(sus.flatMap((s) => (horarios.get(s.id) ?? []).map((h) => h.lessonId))).size
        const cerradas = new Set(
          sus.flatMap((s) =>
            (horarios.get(s.id) ?? [])
              .filter((h) => h.availableAt && new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000) < ahora)
              .map((h) => h.lessonId)
          )
        ).size
        return { curso: sus[0].course, secciones: sus, programadas, cerradas, ...grupo }
      })
    : []
  const totalAlumnos = secciones.reduce((n, s) => n + s._count.enrollments, 0)
  const nCursos = new Set(secciones.map((s) => s.course.id)).size

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Monitor</h1>
        <p className="text-sm text-gray-500">
          {secciones.length === 0
            ? 'Sin cursos a tu alcance'
            : `${nCursos} ${nCursos === 1 ? 'curso' : 'cursos'} · ${secciones.length} ${secciones.length === 1 ? 'sección' : 'secciones'} · ${totalAlumnos} estudiantes`}
        </p>
      </div>

      {abiertas.length > 0 && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En vivo
            </span>
            {abiertas.map((a) => (
              <Link
                key={`${a.seccion.id}-${a.cierra.getTime()}`}
                href={`/dashboard/${a.seccion.course.id}`}
                className="text-sm hover:underline"
              >
                {a.seccion.course.title} · {a.seccion.name}
                <span className="text-gray-600"> · cierra {formatTime(a.cierra)} →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {secciones.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">No tenés cursos asignados todavía</p>
          <p className="mt-1 text-sm text-gray-500">
            El líder de tu carrera te asigna las secciones que vas a acompañar. En cuanto lo haga,
            aparecen acá.
          </p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-15rem)] min-h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <aside className="w-60 shrink-0 overflow-hidden border-r border-gray-200 bg-gray-100">
            <ArbolMonitor admisiones={arbol} seleccion={seleccion} />
          </aside>

          <main className="flex-1 overflow-y-auto p-6">
            {!rama ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-lg font-semibold text-gray-900">Elige una carrera</p>
                <p className="max-w-sm text-sm text-gray-600">
                  En el árbol de la izquierda: admisión, sede y carrera. Ahí están sus cursos y
                  cuántos estudiantes necesitan atención.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <Migas
                  items={[
                    { label: rama.admision.name, href: '/dashboard' },
                    { label: rama.sede.code, href: '/dashboard' },
                    { label: rama.carrera.name },
                  ]}
                />

                <div className="space-y-4">
                  {cursosDeRama.map(({ curso, secciones: sus, programadas, cerradas, matriz, enRiesgo }) => {
                    const alumnos = sus.reduce((a, s) => a + s.alumnos, 0)
                    const href = `/dashboard/${curso.id}/matriz${enlaceRama(seleccion, '')}`
                    return (
                      <Link
                        key={curso.id}
                        href={href}
                        className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-gray-900">{curso.title}</h2>
                              {curso.scope === 'TRANSVERSAL' && (
                                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                  Transversal
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {sus.map((s) => `${s.name} (${s.alumnos})`).join(' · ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {alumnos} {alumnos === 1 ? 'estudiante' : 'estudiantes'} · {cerradas} de {programadas}{' '}
                              sesiones cerradas
                            </p>
                          </div>

                          <div className="shrink-0">
                            {enRiesgo > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                                {enRiesgo} {enRiesgo === 1 ? 'necesita' : 'necesitan'} atención
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                                sin señales
                              </span>
                            )}
                          </div>
                        </div>

                        {matriz.alumnos.length > 0 && (
                          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
                            {matriz.lecciones.length} sesiones con actividad · ver quién es quién →
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
