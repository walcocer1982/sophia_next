import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * POST /api/programacion/agregar-curso
 *
 * Dicta un curso YA DISEÑADO a una carrera, en una sede y una admisión.
 *
 * Reemplaza al formulario de «Nueva sección», donde el nombre se escribía a
 * mano — de ahí salieron «Junio», «Presencial/Híbrido» y «Tutoría», tres
 * criterios distintos para lo mismo. Acá no se escribe nada: la admisión, la
 * sede y la carrera vienen del sitio donde estás parado, y las secciones salen
 * del padrón (User.academicSection), con el nombre derivado: «PM 1», «MMP 5».
 *
 * Los alumnos se matriculan solos, salvo en un curso TRANSVERSAL: ese no se
 * dicta a la cohorte entera sino a un grupo seleccionado, así que crea la
 * sección vacía y la lista se arma después buscando por DNI.
 *
 * Body: { courseId, periodId, sedeId, careerId }
 */
export async function POST(request: Request) {
  try {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId, periodId, sedeId, careerId } = (await request.json()) as {
    courseId?: string; periodId?: string; sedeId?: string; careerId?: string
  }
  if (!courseId || !periodId || !sedeId || !careerId) {
    return NextResponse.json(
      { error: 'courseId, periodId, sedeId y careerId son requeridos' },
      { status: 400 }
    )
  }

  const [curso, sede, carrera] = await Promise.all([
    prisma.course.findFirst({
      where: { id: courseId, deletedAt: null, track: 'REGULAR' },
      select: { id: true, title: true, scope: true, careers: { select: { id: true } } },
    }),
    prisma.sede.findUnique({
      where: { id: sedeId },
      select: { id: true, code: true, careers: { select: { id: true } } },
    }),
    prisma.career.findUnique({ where: { id: careerId }, select: { id: true, code: true, name: true } }),
  ])

  if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  if (!sede || !carrera) return NextResponse.json({ error: 'Sede o carrera no encontrada' }, { status: 404 })

  // Combinaciones imposibles: el formulario viejo dejaba crear una sección de
  // un curso de EOM en IRQ, donde EOM no se dicta.
  if (!sede.careers.some((c) => c.id === carrera.id)) {
    return NextResponse.json(
      { error: `${carrera.code ?? carrera.name} no se dicta en ${sede.code}` },
      { status: 400 }
    )
  }
  const sirve = curso.scope === 'TRANSVERSAL' || curso.careers.some((c) => c.id === carrera.id)
  if (!sirve) {
    return NextResponse.json(
      { error: `«${curso.title}» no pertenece a ${carrera.code ?? carrera.name}` },
      { status: 400 }
    )
  }

  const prefijo = carrera.code ?? carrera.name

  // ── Transversal: sección vacía, la lista se arma por selección ──
  if (curso.scope === 'TRANSVERSAL') {
    const nombre = prefijo
    const yaEsta = await prisma.section.findFirst({
      where: { courseId: curso.id, periodId, sedeId, name: nombre },
      select: { id: true },
    })
    if (yaEsta) {
      return NextResponse.json({ secciones: 0, matriculas: 0, yaExistia: true })
    }
    await prisma.section.create({ data: { name: nombre, courseId: curso.id, periodId, sedeId } })
    logger.info('programacion.agregar_curso.transversal', { courseId, periodId, sedeId, careerId })
    return NextResponse.json({ secciones: 1, matriculas: 0, seleccionable: true })
  }

  // ── De carrera: una sección por grupo del padrón, matrícula completa ──
  const alumnos = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      careerId: carrera.id,
      sedeId: sede.id,
      admissionPeriodId: periodId,
    },
    select: { id: true, academicSection: true },
  })

  if (alumnos.length === 0) {
    return NextResponse.json(
      { error: 'No hay alumnos del padrón en esa carrera, sede y admisión' },
      { status: 400 }
    )
  }

  const grupos = new Map<string, string[]>()
  for (const a of alumnos) {
    // Sin grupo en el padrón van todos juntos a la sección 1.
    const g = a.academicSection?.trim() || '1'
    grupos.set(g, [...(grupos.get(g) ?? []), a.id])
  }

  let secciones = 0
  let matriculas = 0
  for (const [grupo, ids] of [...grupos.entries()].sort()) {
    const nombre = `${prefijo} ${grupo}`
    let seccion = await prisma.section.findFirst({
      where: { courseId: curso.id, periodId, sedeId, name: nombre },
      select: { id: true },
    })
    if (!seccion) {
      seccion = await prisma.section.create({
        data: { name: nombre, courseId: curso.id, periodId, sedeId },
        select: { id: true },
      })
      secciones++
    }
    const inscritos = await prisma.enrollment.findMany({
      where: { sectionId: seccion.id },
      select: { userId: true },
    })
    const ya = new Set(inscritos.map((e) => e.userId))
    const nuevos = ids.filter((id) => !ya.has(id))
    if (nuevos.length) {
      await prisma.enrollment.createMany({
        data: nuevos.map((userId) => ({ userId, sectionId: seccion!.id })),
        skipDuplicates: true,
      })
      matriculas += nuevos.length
    }
  }

  logger.info('programacion.agregar_curso', { courseId, periodId, sedeId, careerId, secciones, matriculas })
  return NextResponse.json({ secciones, matriculas })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error inesperado'
    logger.error('programacion.agregar_curso.error', { error: msg })
    return NextResponse.json({ error: msg.split(/\r?\n/)[0] }, { status: 500 })
  }
}
