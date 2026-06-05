import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

/**
 * GET /api/programacion
 *
 * Devuelve la jerarquía completa: períodos → sedes → secciones → lecciones
 * con el estado de schedule de cada lección (abierta/cerrada/programada).
 *
 * Solo cursos REGULAR (los CONTINUA viven en Eventos, no en Programación).
 */
export async function GET() {
  const auth = await requireRole('ADMIN')
  if (auth instanceof NextResponse) return auth

  const [periods, sedes, sections] = await Promise.all([
    prisma.academicPeriod.findMany({
      orderBy: { name: 'desc' },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.sede.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    }),
    prisma.section.findMany({
      where: { course: { track: 'REGULAR', deletedAt: null } },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        sedeId: true,
        periodId: true,
        course: {
          select: {
            id: true,
            title: true,
            track: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, order: true, isPublished: true },
            },
          },
        },
        instructors: {
          select: { user: { select: { id: true, name: true } } },
        },
        schedules: {
          select: { lessonId: true, availableAt: true, closesAfterHours: true },
        },
        _count: { select: { enrollments: true } },
      },
    }),
  ])

  return NextResponse.json({
    periods,
    sedes,
    sections: sections.map((s) => ({
      id: s.id,
      name: s.name,
      sedeId: s.sedeId,
      periodId: s.periodId,
      course: {
        id: s.course.id,
        title: s.course.title,
        lessons: s.course.lessons,
      },
      enrolledCount: s._count.enrollments,
      instructors: s.instructors.map((i) => ({
        id: i.user.id,
        name: i.user.name,
      })),
      schedules: s.schedules.map((sch) => ({
        lessonId: sch.lessonId,
        availableAt: sch.availableAt,
        closesAfterHours: sch.closesAfterHours,
      })),
    })),
  })
}
