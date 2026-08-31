import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { tituloActividad } from '@/lib/actividad-titulo'
import { normalizeLevel } from '@/lib/levels'
import { otrosCursosDelAlumno } from '@/lib/asistencia'

export const dynamic = 'force-dynamic'

const NIVEL: Record<string, { texto: string; clase: string }> = {
  outstanding: { texto: 'Destacado', clase: 'bg-indigo-50 text-indigo-700' },
  achieved: { texto: 'Logrado', clase: 'bg-emerald-50 text-emerald-700' },
  developing: { texto: 'En proceso', clase: 'bg-amber-50 text-amber-700' },
  beginning: { texto: 'En inicio', clase: 'bg-red-50 text-red-700' },
}

/**
 * La historia de un estudiante en un curso.
 *
 * Una línea por sesión PROGRAMADA, no por sesión hecha — así aparece «no
 * entró», que es la fila que más importa y la que la versión anterior no podía
 * mostrar: decía «No iniciada» tanto para el que faltó como para la sesión que
 * a su sección nunca le programaron.
 */
export default async function EstudiantePage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const rol = session.user.role
  if (rol !== 'ADMIN' && rol !== 'SUPERADMIN' && rol !== 'INSTRUCTOR') redirect('/lessons')

  const { courseId, studentId } = await params
  const { alcance } = await alcanceEfectivo(session)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const ahora = new Date()

  const [alumno, curso] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, dni: true, phone: true },
    }),
    prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { id: true, title: true },
    }),
  ])
  if (!alumno || !curso) notFound()

  // Su sección en este curso, dentro de lo que quien mira puede ver. Si no hay,
  // el alumno no está a su alcance.
  const matricula = await prisma.enrollment.findFirst({
    where: { userId: studentId, section: { AND: [{ courseId }, { isArchived: false }, filtro] } },
    select: {
      section: {
        select: {
          name: true,
          sede: { select: { code: true } },
          period: { select: { name: true } },
          schedules: { select: { lessonId: true, availableAt: true, closesAfterHours: true } },
        },
      },
    },
  })
  // Fuera de alcance: existe, pero no es de tu sede/carrera. Se explica en vez
  // de devolver un 404 pelado, que no distingue «no existe» de «no te toca».
  if (!matricula) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Monitor
        </Link>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="font-medium text-gray-900">Este estudiante no está a tu alcance</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            No pertenece a ninguna sección de tu sede y carrera en {curso.title}. Si deberías
            poder verlo, pedile a tu coordinador que revise tu asignación.
          </p>
        </div>
      </div>
    )
  }

  const horarios = new Map(
    matricula.section.schedules.map((h) => [
      h.lessonId,
      h.availableAt ? new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000) : null,
    ])
  )

  const lecciones = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      contentJson: true,
      sessions: {
        where: { userId: studentId, isTest: false },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          startedAt: true,
          lastActivityAt: true,
          completedAt: true,
          grade: true,
          activities: {
            select: {
              activityId: true,
              status: true,
              attempts: true,
              passedCriteria: true,
              evidenceData: true,
            },
          },
        },
      },
    },
  })

  const filas = lecciones.map((l) => {
    const ses = l.sessions[0] ?? null
    const programada = horarios.has(l.id)
    const cierre = horarios.get(l.id) ?? null

    const avanzo = ses ? ses.activities.filter((a) => a.status === 'COMPLETED').length : 0
    const estado = ses?.completedAt
      ? 'terminada'
      : ses
        ? avanzo > 0
          ? 'a-medias'
          : 'sin-avanzar'
        : !programada
          ? 'no-programada'
          : cierre && cierre < ahora
            ? 'no-entro'
            : 'pendiente'

    const acts = (l.contentJson as { activities?: { id: string; verification?: { question?: string } }[] } | null)?.activities ?? []
    return { leccion: l, ses, estado, cierre, acts }
  })

  // Solo cuentan las sesiones que su sección programó: el resto no se le puede
  // reclamar.
  const otros = await otrosCursosDelAlumno(studentId, filtro, courseId, ahora)

  const deSuPlan = filas.filter((f) => f.estado !== 'no-programada')
  const hechas = deSuPlan.filter((f) => f.estado === 'terminada').length
  const faltas = deSuPlan.filter((f) => f.estado === 'no-entro').length

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="space-y-1">
        <Link
          href={`/dashboard/${courseId}/matriz`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {curso.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{alumno.name ?? alumno.email}</h1>
        <p className="text-sm text-gray-500">
          {matricula.section.name} · {matricula.section.sede?.code ?? '—'} ·{' '}
          {matricula.section.period.name}
          {alumno.dni ? ` · DNI ${alumno.dni}` : ' · sin DNI del padrón'}
        </p>
        <p className="text-sm">
          <span className="font-medium">
            {hechas} de {deSuPlan.length} sesiones
          </span>
          {faltas > 0 && (
            <span className="text-red-700"> · faltó a {faltas}</span>
          )}
          {alumno.phone && (
            <a
              href={`https://wa.me/51${alumno.phone.replace(/\D/g, '').slice(-9)}`}
              target="_blank"
              rel="noreferrer"
              className="ml-3 text-blue-600 hover:underline"
            >
              WhatsApp
            </a>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {filas.map(({ leccion, ses, estado, cierre, acts }) => {
          if (estado === 'no-programada') {
            return (
              <div
                key={leccion.id}
                className="rounded-xl border border-dashed border-gray-200 px-5 py-3"
              >
                <p className="text-sm text-gray-400">
                  {leccion.title} — no programada para {matricula.section.name}
                </p>
              </div>
            )
          }

          const minutos = ses
            ? Math.round((ses.lastActivityAt.getTime() - ses.startedAt.getTime()) / 60_000)
            : null

          return (
            <div key={leccion.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{leccion.title}</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {estado === 'no-entro' &&
                      `No entró · cerró el ${cierre?.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`}
                    {estado === 'pendiente' && 'Aún abierta'}
                    {ses &&
                      `${ses.startedAt.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} · ${minutos} min`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {estado === 'terminada' && ses?.grade !== null && ses?.grade !== undefined ? (
                    <span className="text-lg font-semibold tabular-nums">
                      {Math.round(ses.grade)}
                    </span>
                  ) : estado === 'terminada' ? (
                    <span className="text-xs text-amber-700">
                      sin nota · avanzó por límite
                    </span>
                  ) : estado === 'no-entro' ? (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      No entró
                    </span>
                  ) : estado === 'a-medias' ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      A medias
                    </span>
                  ) : estado === 'sin-avanzar' ? (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      Abrió sin avanzar
                    </span>
                  ) : null}
                </div>
              </div>

              {ses && acts.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {acts.map((a, i) => {
                    const p = ses.activities.find((x) => x.activityId === a.id)
                    const ev = p?.evidenceData as
                      | { attempts?: { analysis?: { understanding_level?: string } }[] }
                      | null
                    const ultimo = ev?.attempts?.at(-1)?.analysis?.understanding_level
                    const nivel = ultimo ? NIVEL[normalizeLevel(ultimo)] : null

                    return (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="w-5 shrink-0 text-xs tabular-nums text-gray-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                          {tituloActividad(a, i)}
                        </span>
                        {p?.attempts ? (
                          <span className="shrink-0 text-xs text-gray-400">
                            {p.attempts} {p.attempts === 1 ? 'intento' : 'intentos'}
                          </span>
                        ) : null}
                        {p?.status === 'COMPLETED' && p.passedCriteria === false ? (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            por límite
                          </span>
                        ) : nivel ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${nivel.clase}`}
                          >
                            {nivel.texto}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-gray-300">sin llegar</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {otros.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-5">
          <h2 className="text-sm font-semibold text-gray-500">Sus otros cursos</h2>
          {otros.map((o) => (
            <Link
              key={o.courseId}
              href={`/dashboard/${o.courseId}/${studentId}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm hover:border-gray-300"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{o.titulo}</p>
                <p className="text-sm text-gray-500">
                  {o.seccion} · {o.hechas} de {o.programadas} sesiones
                </p>
              </div>
              {o.faltas > 0 && (
                <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  faltó a {o.faltas}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
