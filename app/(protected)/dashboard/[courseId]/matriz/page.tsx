import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { matrizDelCurso, type EstadoSesion } from '@/lib/asistencia'
import { MatrizTabla } from '@/components/monitor/matriz-tabla'

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
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPERADMIN' && role !== 'INSTRUCTOR') redirect('/lessons')

  const { courseId } = await params
  const { alcance } = await alcanceEfectivo(session)

  const curso = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, title: true, scope: true },
  })
  if (!curso) notFound()

  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const matriz = await matrizDelCurso(courseId, filtro)

  const cuenta = (e: EstadoSesion) =>
    matriz.alumnos.reduce(
      (a, f) => a + Object.values(f.celdas).filter((c) => c.estado === e).length,
      0
    )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Monitor
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{curso.title}</h1>
        <p className="text-sm text-gray-500">
          {matriz.alumnos.length} estudiantes · {matriz.lecciones.length} sesiones programadas
        </p>
      </div>

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
          </div>

          <MatrizTabla matriz={matriz} courseId={courseId} />
        </>
      )}
    </div>
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
