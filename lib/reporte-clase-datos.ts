import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cierreDeHorario, cierreDeVentana, representativa, ventanaCerrada } from '@/lib/monitor'
import { reporteDeSesion } from '@/lib/reporte-sesion'
import { reporteDeClase, type AlumnoDeClase, type ReporteClase } from '@/lib/reporte-clase'
import type { Activity } from '@/types/lesson'

/**
 * Carga todo lo que necesita el reporte de la sesión por sección (22 oct 2026):
 * la lección, la sección con su horario, y un reporte por alumno matriculado.
 * Lo usan la página del reporte y la API que pide la redacción a la IA, para
 * que ambas vean exactamente los mismos números.
 */
export type DatosReporteClase = {
  curso: { id: string; title: string; methodology: string }
  leccion: { id: string; title: string; order: number; keyPoints: string[]; actividades: Activity[] }
  seccion: {
    id: string
    name: string
    periodo: string
    sede: string | null
    cierre: Date | null
    abierta: boolean
    cerradoPorInstructor: boolean
    tieneHorario: boolean
  }
  alumnos: AlumnoDeClase[]
  clase: ReporteClase
}

export async function cargarReporteDeClase(o: {
  courseId: string
  lessonId: string
  sectionId: string
  filtro: Prisma.SectionWhereInput
  ahora?: Date
}): Promise<DatosReporteClase | null> {
  const ahora = o.ahora ?? new Date()
  const [curso, leccion, seccion] = await Promise.all([
    prisma.course.findFirst({ where: { id: o.courseId, deletedAt: null }, select: { id: true, title: true, methodology: true } }),
    prisma.lesson.findFirst({
      where: { id: o.lessonId, courseId: o.courseId },
      select: { id: true, title: true, order: true, keyPoints: true, contentJson: true, availableAt: true, closesAfterHours: true },
    }),
    prisma.section.findFirst({
      where: { AND: [{ id: o.sectionId, courseId: o.courseId, isArchived: false }, o.filtro] },
      select: {
        id: true,
        name: true,
        period: { select: { name: true } },
        sede: { select: { code: true } },
        schedules: { where: { lessonId: o.lessonId }, select: { availableAt: true, closesAfterHours: true, closedAt: true } },
        enrollments: { select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } },
      },
    }),
  ])
  if (!curso || !leccion || !seccion) return null

  const actividades = (leccion.contentJson as { activities?: Activity[] } | null)?.activities ?? []
  const horario = seccion.schedules[0] ?? null
  const cierre = horario ? cierreDeHorario(horario) : cierreDeVentana(leccion.availableAt, leccion.closesAfterHours)
  const abierta = !!horario?.availableAt && horario.availableAt <= ahora && !!cierre && ahora < cierre

  const userIds = seccion.enrollments.map((e) => e.user.id)
  const sesiones = await prisma.lessonSession.findMany({
    where: { lessonId: o.lessonId, isTest: false, userId: { in: userIds } },
    orderBy: { startedAt: 'asc' },
    select: {
      id: true,
      userId: true,
      activityId: true,
      startedAt: true,
      lastActivityAt: true,
      completedAt: true,
      activities: {
        select: { activityId: true, status: true, attempts: true, passedCriteria: true, evidenceData: true, startedAt: true, completedAt: true },
      },
      messages: { where: { role: 'user' }, orderBy: { timestamp: 'asc' }, select: { activityId: true, content: true, timestamp: true } },
    },
  })
  const porUsuario = new Map<string, typeof sesiones>()
  for (const s of sesiones) porUsuario.set(s.userId, [...(porUsuario.get(s.userId) ?? []), s])

  const alumnos: AlumnoDeClase[] = seccion.enrollments.map(({ user }) => {
    const ses = representativa(porUsuario.get(user.id) ?? []) ?? null
    return {
      userId: user.id,
      nombre: (user.name ?? user.email ?? 'Sin nombre').replace(' (simulado)', ''),
      reporte: ses
        ? reporteDeSesion({
            actividades,
            keyPoints: leccion.keyPoints,
            progresos: ses.activities,
            terminada: !!ses.completedAt,
            cerrada: !!ses.completedAt || ventanaCerrada(cierre, ses.lastActivityAt, ahora),
            metodologia: curso.methodology,
            mensajes: ses.messages,
            actividadActualId: ses.activityId,
            lastActivityAt: ses.lastActivityAt,
            ahora,
          })
        : null,
    }
  })

  return {
    curso,
    leccion: { id: leccion.id, title: leccion.title, order: leccion.order, keyPoints: leccion.keyPoints, actividades },
    seccion: {
      id: seccion.id,
      name: seccion.name,
      periodo: seccion.period.name,
      sede: seccion.sede?.code ?? null,
      cierre,
      abierta,
      cerradoPorInstructor: !!horario?.closedAt,
      tieneHorario: !!horario?.availableAt,
    },
    alumnos,
    clase: reporteDeClase(alumnos, leccion.keyPoints),
  }
}
