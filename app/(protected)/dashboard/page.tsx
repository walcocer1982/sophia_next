import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { matrizDelCurso } from '@/lib/asistencia'

export const dynamic = 'force-dynamic'

/**
 * Monitor — la portada.
 *
 * Antes esta pantalla tenía cuatro indicadores («activos ahora», «en dificultad»,
 * «completaron hoy») que decían 0 el 99% del tiempo, porque son datos de EN VIVO
 * y una ventana está abierta dos horas, cinco veces por curso. Debajo, una tabla
 * agregada por lección donde no había un solo nombre, y un registro de eventos
 * ordenado por hora llamado «historial».
 *
 * Ahora responde la pregunta del martes: qué curso está en problemas y a cuántos
 * hay que llamar. Lo de «en vivo» aparece solo cuando de verdad hay una ventana
 * abierta.
 */
export default async function MonitorPage() {
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
      sede: { select: { code: true } },
      period: { select: { name: true } },
      course: { select: { id: true, title: true, scope: true } },
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

  // Una matriz por curso: de ahí sale «cuántos necesitan atención» sin inventar
  // una segunda definición de lo mismo.
  const cursoIds = [...new Set(secciones.map((s) => s.course.id))]
  const resumenes = await Promise.all(
    cursoIds.map(async (id) => {
      const m = await matrizDelCurso(id, filtro, ahora)
      const enRiesgo = m.alumnos.filter((a) =>
        Object.values(a.celdas).some((c) => c.estado === 'no-entro')
      ).length
      return { id, matriz: m, enRiesgo }
    })
  )
  const porCurso = new Map(resumenes.map((r) => [r.id, r]))

  const cursos = cursoIds.map((id) => {
    const sus = secciones.filter((s) => s.course.id === id)
    return { curso: sus[0].course, secciones: sus, ...porCurso.get(id)! }
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Monitor</h1>
        <p className="text-sm text-gray-500">
          {cursos.length === 0
            ? 'Sin cursos a tu alcance'
            : `${cursos.length} ${cursos.length === 1 ? 'curso' : 'cursos'} · ${secciones.length} ${secciones.length === 1 ? 'sección' : 'secciones'}`}
        </p>
      </div>

      {abiertas.length > 0 && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En vivo
            </span>
            <span className="text-sm">
              {abiertas.length === 1
                ? `${abiertas[0].seccion.course.title} · ${abiertas[0].seccion.name}`
                : `${abiertas.length} sesiones abiertas ahora`}
            </span>
            <span className="text-sm text-gray-600">
              cierra {abiertas[0].cierra.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      )}

      {cursos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">No tenés cursos asignados todavía</p>
          <p className="mt-1 text-sm text-gray-500">
            El líder de tu carrera te asigna las secciones que vas a acompañar. En cuanto lo haga,
            aparecen acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cursos.map(({ curso, secciones: sus, matriz, enRiesgo }) => {
            const alumnos = sus.reduce((a, s) => a + s._count.enrollments, 0)
            const programadas = new Set(sus.flatMap((s) => s.schedules.map((h) => h.lessonId))).size
            const cerradas = new Set(
              sus.flatMap((s) =>
                s.schedules
                  .filter(
                    (h) =>
                      h.availableAt &&
                      new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000) < ahora
                  )
                  .map((h) => h.lessonId)
              )
            ).size

            return (
              <Link
                key={curso.id}
                href={`/dashboard/${curso.id}/matriz`}
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
                      {sus
                        .map((s) => `${s.name} · ${s.sede?.code ?? '—'} · ${s.period.name}`)
                        .join('   ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {alumnos} {alumnos === 1 ? 'estudiante' : 'estudiantes'} ·{' '}
                      {cerradas} de {programadas} sesiones cerradas
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
      )}
    </div>
  )
}
