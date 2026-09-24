import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cursosVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { Explorador, type CursoLista, type GrupoLista } from '@/components/planner/explorador'

export const runtime = 'nodejs'

const TRANSVERSAL = '__transversal'
const SIN_CARRERA = '__sin-carrera'

/**
 * Catálogo de cursos, con el mismo patrón que Programación: barra para
 * ubicarse, panel para trabajar.
 *
 * El árbol tiene un solo nivel —la carrera— porque acá se diseña la PLANTILLA,
 * y la plantilla no tiene admisión ni sede: un curso se diseña una vez y se
 * dicta en muchas partes. Y el curso se abre a pantalla completa, no en el
 * panel: poner fechas cabe en 900 px, diseñar una sesión no.
 */
export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ carrera?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const role = session.user.role || 'STUDENT'
  if (role === 'STUDENT') redirect('/lessons')

  const { carrera } = await searchParams
  const seleccion = carrera ?? null

  // Qué cursos ve cada rol. Antes había dos vistas duplicadas —una para
  // superadmin y otra para el resto—; ahora solo cambia el filtro.
  let where: Record<string, unknown> = { deletedAt: null }
  const { alcance } = await alcanceEfectivo(session)
  if (alcance.role !== 'SUPERADMIN') {
    // El alcance ya no distingue ADMIN de INSTRUCTOR: ambos son dueños de su
    // carrera en su sede. Antes el INSTRUCTOR solo veía las secciones que le
    // asignaron — y los cuatro instructores del sistema tenían cero.
    where = {
      AND: [cursosVisibles(alcance), { deletedAt: null }],
    }
  }

  const [cursosRaw, carreras] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { title: 'asc' },
      select: {
        id: true, title: true, capacidad: true, isPublished: true,
        scope: true, careerId: true,
        careers: { select: { id: true } },
        user: { select: { name: true } },
        lessons: { select: { contentJson: true, isPublished: true } },
      },
    }),
    prisma.career.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
  ])

  const cursos: CursoLista[] = cursosRaw.map((c) => {
    const disenadas = c.lessons.filter((l) => {
      const j = l.contentJson as { activities?: unknown[] } | null
      return Array.isArray(j?.activities) && j.activities.length > 0
    }).length

    // Un curso pertenece a varias carreras (m:n). Los transversales no tienen
    // carrera porque sirven a todas — no es un dato faltante.
    const grupos =
      c.scope === 'TRANSVERSAL'
        ? [TRANSVERSAL]
        : c.careers.length > 0
          ? c.careers.map((x) => x.id)
          : c.careerId
            ? [c.careerId]
            : [SIN_CARRERA]

    return {
      id: c.id,
      title: c.title,
      capacidad: c.capacidad,
      isPublished: c.isPublished,
      scope: c.scope,
      instructor: c.user?.name ?? null,
      total: c.lessons.length,
      disenadas,
      listas: c.lessons.filter((l) => l.isPublished).length,
      grupos,
    }
  })

  // Solo se listan los grupos que tienen cursos: una carrera vacía en la barra
  // es ruido, no información.
  const acumular = (clave: string, nombre: string, tipo: GrupoLista['tipo']): GrupoLista | null => {
    const suyos = cursos.filter((c) => c.grupos.includes(clave))
    if (suyos.length === 0) return null
    return {
      clave, nombre, tipo,
      cursos: suyos.length,
      disenadas: suyos.reduce((n, c) => n + c.disenadas, 0),
      total: suyos.reduce((n, c) => n + c.total, 0),
    }
  }

  const grupos = [
    acumular(TRANSVERSAL, 'Transversales', 'transversal'),
    ...carreras.map((c) => acumular(c.id, c.code ?? c.name, 'carrera')),
    acumular(SIN_CARRERA, 'Sin carrera', 'sin'),
  ].filter((g): g is GrupoLista => g !== null)

  const sinDisenar = cursos.reduce((n, c) => n + (c.total - c.disenadas), 0)
  const listas = cursos.reduce((n, c) => n + c.listas, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diseño</h1>
          <p className="mt-1 text-sm text-gray-500">
            {cursos.length} curso{cursos.length !== 1 ? 's' : ''}
            {sinDisenar > 0 && (
              <>
                {' · '}
                <span className="font-medium text-amber-700">{sinDisenar} sesiones sin diseñar</span>
              </>
            )}
            {' · '}
            {listas} listas para programar
          </p>
        </div>
        {role !== 'INSTRUCTOR' && (
          <Link href="/planner/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nuevo curso
            </Button>
          </Link>
        )}
      </div>

      <Explorador grupos={grupos} cursos={cursos} seleccion={seleccion} />
    </div>
  )
}
