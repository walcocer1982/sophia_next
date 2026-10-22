import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { matrizDelCurso, type EstadoSesion } from '@/lib/asistencia'
import { enlaceRama, seleccionDe, SIN_SEDE } from '@/lib/monitor-arbol'
import { MatrizTabla } from '@/components/monitor/matriz-tabla'
import { BloqueSeccion } from '@/components/monitor/bloque-seccion'
import { TerminarBloque } from '@/components/monitor/terminar-bloque'
import { formatTime } from '@/lib/formatters'
import { cargarReporteDeClase, type DatosReporteClase } from '@/lib/reporte-clase-datos'
import { Migas, type Miga } from '@/components/programacion/breadcrumb'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * Alumnos x sesiones. Responde los dos ejes de una vez: una fila con rojos es
 * un alumno en problemas, una columna con rojos es una sesión rota.
 *
 * La tabla que había antes agregaba por lección y no mostraba un solo nombre,
 * así que «¿cómo le fue a cada estudiante?» no tenía respuesta en pantalla.
 */
export default async function MatrizPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPERADMIN' && role !== 'INSTRUCTOR') redirect('/lessons')

  const { courseId } = await params
  const q = await searchParams
  const { alcance } = await alcanceEfectivo(session)

  const curso = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, title: true, scope: true },
  })
  if (!curso) notFound()

  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)

  // La rama con la que se llegó desde la portada (admisión y sede) acota las
  // secciones; la carrera no hace falta, el curso ya está elegido. Encima, se
  // puede mirar una sola sección (21 oct 2026).
  const seleccion = seleccionDe(q)
  const rama: Prisma.SectionWhereInput = {
    ...(seleccion.admision ? { periodId: seleccion.admision } : {}),
    ...(seleccion.sede ? { sedeId: seleccion.sede === SIN_SEDE.id ? null : seleccion.sede } : {}),
  }
  const seccionesDelCurso = await prisma.section.findMany({
    where: { AND: [{ courseId }, { isArchived: false }, filtro, rama] },
    select: {
      id: true,
      name: true,
      _count: { select: { enrollments: true } },
      period: { select: { name: true } },
      sede: { select: { code: true } },
    },
    orderBy: { name: 'asc' },
  })
  const pedida = typeof q.seccion === 'string' ? q.seccion : null
  const soloSeccion = pedida && seccionesDelCurso.some((s) => s.id === pedida) ? pedida : null
  const matriz = await matrizDelCurso(courseId, {
    AND: [filtro, rama, ...(soloSeccion ? [{ id: soloSeccion }] : [])],
  })

  // El bloque con Sophia de cada sección a la vista (22 oct 2026): la última
  // sesión que ya abrió. Abierta: el botón para terminarla. Cerrada: los puntos
  // de repaso para los 15 minutos del instructor.
  const ahora = new Date()
  const enVista = soloSeccion ? seccionesDelCurso.filter((s) => s.id === soloSeccion) : seccionesDelCurso
  const ultimas = await prisma.sectionLessonSchedule.findMany({
    where: { sectionId: { in: enVista.map((s) => s.id) }, availableAt: { lte: ahora } },
    orderBy: { availableAt: 'desc' },
    select: { sectionId: true, lessonId: true },
  })
  const unaPorSeccion = enVista
    .map((s) => ultimas.find((u) => u.sectionId === s.id))
    .filter((u): u is { sectionId: string; lessonId: string } => !!u)
  const bloques = (
    await Promise.all(unaPorSeccion.map((u) => cargarReporteDeClase({ courseId, lessonId: u.lessonId, sectionId: u.sectionId, filtro, ahora })))
  ).filter((d): d is DatosReporteClase => d !== null)

  const base = `/dashboard/${courseId}/matriz`
  const conSeccion = (id: string | null) => {
    const u = new URLSearchParams(enlaceRama(seleccion, '').replace(/^\?/, ''))
    if (id) u.set('seccion', id)
    const s = u.toString()
    return s ? `${base}?${s}` : base
  }
  const carrera = seleccion.carrera
    ? await prisma.career.findUnique({ where: { id: seleccion.carrera }, select: { name: true } })
    : null
  const migas: Miga[] = [{ label: 'Monitor', href: '/dashboard' }]
  if (seleccion.admision && seccionesDelCurso[0]) {
    migas.push({ label: seccionesDelCurso[0].period.name, href: '/dashboard' })
    migas.push({ label: seccionesDelCurso[0].sede?.code ?? SIN_SEDE.code, href: '/dashboard' })
  }
  if (carrera) migas.push({ label: carrera.name, href: enlaceRama(seleccion) })
  migas.push({ label: curso.title })

  // Los que desertaron salen del denominador: «uno de cada tres abandona»
  // pasa a ser abandono de la tutoría, no del instituto.
  const activos = matriz.alumnos.filter((f) => !f.desertor)
  const desertaron = matriz.alumnos.length - activos.length
  const cuenta = (e: EstadoSesion) =>
    activos.reduce(
      (a, f) => a + Object.values(f.celdas).filter((c) => c.estado === e).length,
      0
    )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Migas items={migas} />
          <h1 className="text-2xl font-bold tracking-tight">{curso.title}</h1>
          <p className="text-sm text-gray-500">
            {matriz.alumnos.length} estudiantes · {matriz.lecciones.length} sesiones programadas
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Terminar el bloque de Sophia, junto a «Ver en vivo», mientras la ventana está abierta */}
          {bloques
            .filter((d) => d.seccion.abierta)
            .map((d) => (
              <div key={`${d.seccion.id}-${d.leccion.id}`} className="flex items-center gap-2">
                {bloques.filter((x) => x.seccion.abierta).length > 1 && (
                  <span className="text-xs text-gray-500">
                    {d.seccion.name} · S{d.leccion.order}
                  </span>
                )}
                <TerminarBloque
                  courseId={courseId}
                  sectionId={d.seccion.id}
                  lessonId={d.leccion.id}
                  cierre={d.seccion.cierre ? formatTime(d.seccion.cierre) : null}
                  cerradoPorInstructor={false}
                  abierta
                />
              </div>
            ))}
          <Link
            href={`/dashboard/${courseId}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver en vivo →
          </Link>
        </div>
      </div>

      {seccionesDelCurso.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Ficha href={conSeccion(null)} activa={!soloSeccion}>
            Todas las secciones ({seccionesDelCurso.reduce((n, s) => n + s._count.enrollments, 0)})
          </Ficha>
          {seccionesDelCurso.map((s) => (
            <Ficha key={s.id} href={conSeccion(s.id)} activa={soloSeccion === s.id}>
              {s.name} · {s.sede?.code ?? '—'} · {s.period.name} ({s._count.enrollments})
            </Ficha>
          ))}
        </div>
      )}

      {bloques.map((d) => (
        <BloqueSeccion key={`${d.seccion.id}-${d.leccion.id}`} courseId={courseId} datos={d} />
      ))}

      {matriz.alumnos.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            No hay estudiantes matriculados a tu alcance en este curso
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Si esperabas ver un grupo acá, revisá que la sección esté en tu sede y carrera.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Resumen etiqueta="No entraron" valor={cuenta('no-entro')} tono="rojo" />
            <Resumen etiqueta="A medias" valor={cuenta('a-medias')} tono="ambar" />
            <Resumen etiqueta="Abrieron sin avanzar" valor={cuenta('sin-avanzar')} tono="naranja" />
            <Resumen etiqueta="Terminadas" valor={cuenta('terminada')} tono="verde" />
            <Resumen etiqueta="Aún abiertas" valor={cuenta('pendiente')} tono="gris" />
            {desertaron > 0 && <Resumen etiqueta="Desertaron" valor={desertaron} tono="gris" />}
          </div>

          <MatrizTabla
            matriz={matriz}
            courseId={courseId}
            seccionDelReporte={soloSeccion ?? (seccionesDelCurso.length === 1 ? seccionesDelCurso[0].id : null)}
          />
        </>
      )}
    </div>
  )
}

function Ficha({ href, activa, children }: { href: string; activa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        activa ? 'border-indigo-200 bg-indigo-50 font-medium text-indigo-900' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </Link>
  )
}

function Resumen({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string
  valor: number
  tono: 'rojo' | 'ambar' | 'naranja' | 'verde' | 'gris'
}) {
  const clases = {
    rojo: 'border-red-200 bg-red-50 text-red-700',
    ambar: 'border-amber-200 bg-amber-50 text-amber-700',
    naranja: 'border-orange-200 bg-orange-50 text-orange-700',
    verde: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    gris: 'border-gray-200 bg-gray-50 text-gray-600',
  }[tono]

  return (
    <div className={`rounded-xl border px-4 py-3 ${clases}`}>
      <p className="text-2xl font-semibold tabular-nums leading-none">{valor}</p>
      <p className="mt-1 text-xs font-medium">{etiqueta}</p>
    </div>
  )
}
