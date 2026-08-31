import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * GET /api/programacion
 *
 * Devuelve la jerarquía completa: períodos → sedes → secciones → lecciones
 * con el estado de schedule de cada lección (abierta/cerrada/programada).
 *
 * Permisos:
 *  - SUPERADMIN / ADMIN: ven todas las secciones
 *  - INSTRUCTOR: ven solo las secciones donde son SectionInstructor
 *  - STUDENT: 403
 *
 * Solo cursos REGULAR (los CONTINUA viven en Eventos, no en Programación).
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role
  if (role !== 'SUPERADMIN' && role !== 'ADMIN' && role !== 'INSTRUCTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ?includeArchived=true incluye los períodos cerrados (isActive=false)
  // Y las secciones archivadas (isArchived=true). Default: false.
  // Filtros independientes pero compartidos en una flag — UI más simple.
  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('includeArchived') === 'true'

  let sectionWhere: Prisma.SectionWhereInput = {
    course: { track: 'REGULAR', deletedAt: null },
  }
  // Antes solo el INSTRUCTOR se recortaba, y por sección asignada; ADMIN veía
  // todas las sedes. Ahora los tres roles pasan por el mismo alcance: sede x
  // carrera, con comodín para los cursos transversales.
  const { alcance, viendoComo } = await alcanceEfectivo(session)
  if (alcance.role !== 'SUPERADMIN') {
    // AND y no spread: el alcance trae su propio `course` y `OR`, que pisarían
    // el filtro de track REGULAR.
    sectionWhere = { AND: [sectionWhere, seccionesVisibles(alcance)] }
  }

  // Si no se incluye archived, filtrar secciones de períodos cerrados Y
  // secciones individualmente archivadas.
  if (!includeArchived) {
    sectionWhere = {
      ...sectionWhere,
      period: { isActive: true },
      isArchived: false,
    }
  }

  const [periods, sedes, sections] = await Promise.all([
    prisma.academicPeriod.findMany({
      where: includeArchived ? undefined : { isActive: true },
      orderBy: { name: 'desc' },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.sede.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      // careers: alimenta el nivel de carreras de la navegación
      // (período → sede → CARRERA → curso → sesión).
      select: {
        id: true, code: true, name: true,
        careers: { select: { id: true, code: true, name: true, slug: true }, orderBy: { name: 'asc' } },
      },
    }),
    prisma.section.findMany({
      where: sectionWhere,
      orderBy: [
        { isArchived: 'asc' },           // activas primero
        { startDate: { sort: 'desc', nulls: 'last' } }, // las más recientes arriba; sin fecha al final
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        sedeId: true,
        periodId: true,
        isArchived: true,
        archivedAt: true,
        startDate: true,
        endDate: true,
        course: {
          select: {
            id: true,
            title: true,
            track: true,
            scope: true,
            career: {
              select: { id: true, code: true, name: true },
            },
            // careers (m:n): a qué carreras sirve el curso. Con scope
            // TRANSVERSAL se ignora — sirve a todas.
            careers: {
              select: { id: true, code: true, name: true, slug: true },
            },
            lessons: {
              orderBy: { order: 'asc' },
              // contentJson solo para contar actividades: con eso la UI puede
              // avisar cuando la ventana horaria queda corta para el plan.
              // No se envía al cliente.
              select: { id: true, title: true, order: true, isPublished: true, contentJson: true },
            },
          },
        },
        instructors: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        enrollments: {
          orderBy: { user: { name: 'asc' } },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        schedules: {
          select: { lessonId: true, availableAt: true, closesAfterHours: true },
        },
        _count: { select: { enrollments: true } },
      },
    }),
  ])

  // Cursos REGULAR para selector al crear sección (solo si tiene permisos)
  const canCreate = role === 'SUPERADMIN' || role === 'ADMIN'
  const regularCourses = canCreate
    ? await prisma.course.findMany({
        where: { track: 'REGULAR', deletedAt: null },
        orderBy: { title: 'asc' },
        select: {
          id: true, title: true, scope: true,
          careers: { select: { id: true } },
        },
      })
    : []

  // Usuarios disponibles para inscribir / asignar como instructor
  const [availableStudents, availableInstructors] = canCreate
    ? await Promise.all([
        prisma.user.findMany({
          where: { role: 'STUDENT' },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, email: true },
        }),
        prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPERADMIN', 'INSTRUCTOR'] } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, email: true, role: true },
        }),
      ])
    : [[], []]

  return NextResponse.json({
    currentUserRole: role,
    viendoComo,
    canCreate,
    periods,
    sedes,
    regularCourses,
    sections: sections.map((s) => ({
      id: s.id,
      name: s.name,
      sedeId: s.sedeId,
      periodId: s.periodId,
      isArchived: s.isArchived,
      archivedAt: s.archivedAt,
      startDate: s.startDate,
      endDate: s.endDate,
      course: {
        id: s.course.id,
        title: s.course.title,
        scope: s.course.scope,
        career: s.course.career,
        careers: s.course.careers,
        lessons: s.course.lessons.map((l) => {
          const cj = l.contentJson as { activities?: unknown[] } | null
          return {
            id: l.id,
            title: l.title,
            order: l.order,
            isPublished: l.isPublished,
            activityCount: Array.isArray(cj?.activities) ? cj.activities.length : 0,
          }
        }),
      },
      enrolledCount: s._count.enrollments,
      enrolledStudents: s.enrollments.map((e) => ({
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
      })),
      instructors: s.instructors.map((i) => ({
        id: i.user.id,
        name: i.user.name,
        email: i.user.email,
      })),
      schedules: s.schedules.map((sch) => ({
        lessonId: sch.lessonId,
        availableAt: sch.availableAt,
        closesAfterHours: sch.closesAfterHours,
      })),
    })),
    availableStudents,
    availableInstructors,
  })
}
