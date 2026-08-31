import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * «No entró» — el dato que Monitor nunca tuvo.
 *
 * Hoy solo existe registro de quien ABRIÓ la sesión, así que el ausente no
 * aparece en ninguna cuenta: en la S0 de ABQ, 8 de 12 no entraron y ninguna
 * pantalla lo dice. Acá se deriva en vez de materializarse — las tres tablas
 * necesarias ya existen:
 *
 *     Enrollment (quién debía)  x  SectionLessonSchedule (cuándo cerró)
 *                               -  LessonSession (quién entró)
 *
 * Materializar filas «pendiente» al programar parecería más simple, pero se
 * pudre: si alguien se matricula después, si cambia la fecha o si se reabre la
 * sesión, quedan filas mintiendo. Derivar no puede desincronizarse.
 */

export type EstadoSesion =
  | 'no-programada' // la sección nunca programó esta lección
  | 'pendiente' // programada, la ventana aún no cerró, no entró
  | 'no-entro' // la ventana cerró y nunca abrió
  | 'sin-avanzar' // abrió y no completó NI UNA actividad
  | 'a-medias' // avanzó algo y no terminó
  | 'terminada'

export type Celda = {
  estado: EstadoSesion
  grade: number | null
  minutos: number | null
  completedAt: Date | null
}

export type FilaAlumno = {
  userId: string
  nombre: string
  dni: string | null
  telefono: string | null
  seccion: string
  celdas: Record<string, Celda> // lessonId -> celda
}

export type Matriz = {
  lecciones: { id: string; title: string; order: number; cierre: Date | null; programadaEn: number }[]
  alumnos: FilaAlumno[]
}

/**
 * Matriz alumnos x sesiones de un curso, recortada al alcance recibido.
 *
 * Las sesiones se unen por `(userId, lessonId)` y NO por `sectionId`: ese campo
 * es un snapshot opcional y 126 de 650 sesiones lo tienen nulo — unir por él
 * perdería una de cada cinco en silencio.
 */
export async function matrizDelCurso(
  courseId: string,
  alcanceSecciones: Prisma.SectionWhereInput,
  ahora = new Date()
): Promise<Matriz> {
  const secciones = await prisma.section.findMany({
    // Sin archivadas: una cohort cerrada no se «llama por teléfono». Al
    // superadmin le sumaban 50 alumnos de secciones terminadas.
    where: { AND: [{ courseId }, { isArchived: false }, alcanceSecciones] },
    select: {
      id: true,
      name: true,
      enrollments: {
        select: {
          user: { select: { id: true, name: true, email: true, dni: true, phone: true } },
        },
      },
      schedules: {
        select: { lessonId: true, availableAt: true, closesAfterHours: true },
      },
    },
  })

  const lecciones = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, order: true },
  })

  // Cierre por (sección, lección) y cuántas secciones programaron cada lección.
  const cierrePorSeccion = new Map<string, Date | null>()
  const seccionesConLeccion = new Map<string, number>()
  for (const s of secciones) {
    for (const h of s.schedules) {
      const cierre = h.availableAt
        ? new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000)
        : null
      cierrePorSeccion.set(`${s.id}:${h.lessonId}`, cierre)
      seccionesConLeccion.set(h.lessonId, (seccionesConLeccion.get(h.lessonId) ?? 0) + 1)
    }
  }

  const userIds = [...new Set(secciones.flatMap((s) => s.enrollments.map((e) => e.user.id)))]
  const sesiones = await prisma.lessonSession.findMany({
    where: {
      isTest: false,
      userId: { in: userIds },
      lessonId: { in: lecciones.map((l) => l.id) },
    },
    select: {
      id: true,
      userId: true,
      lessonId: true,
      completedAt: true,
      grade: true,
      startedAt: true,
      lastActivityAt: true,
    },
    orderBy: { startedAt: 'asc' },
  })

  // Un alumno puede tener varios intentos: gana el que terminó, y si ninguno
  // terminó, el más reciente.
  // Cuántas actividades completó cada sesión: separa «entró y se fue» de
  // «avanzó y se atascó». Para el instructor son dos llamadas distintas.
  const avance = new Map<string, number>()
  for (const g of await prisma.activityProgress.groupBy({
    by: ['lessonSessionId'],
    where: { status: 'COMPLETED', lessonSession: { userId: { in: userIds } } },
    _count: { _all: true },
  })) {
    avance.set(g.lessonSessionId, g._count._all)
  }

  const porAlumnoLeccion = new Map<string, (typeof sesiones)[number]>()
  for (const s of sesiones) {
    const k = `${s.userId}:${s.lessonId}`
    const previa = porAlumnoLeccion.get(k)
    if (!previa) porAlumnoLeccion.set(k, s)
    else if (!previa.completedAt && s.completedAt) porAlumnoLeccion.set(k, s)
    else if (!previa.completedAt && previa.startedAt < s.startedAt) porAlumnoLeccion.set(k, s)
  }

  const alumnos: FilaAlumno[] = []
  for (const sec of secciones) {
    for (const e of sec.enrollments) {
      const celdas: Record<string, Celda> = {}
      for (const l of lecciones) {
        const cierre = cierrePorSeccion.get(`${sec.id}:${l.id}`)
        const programada = cierrePorSeccion.has(`${sec.id}:${l.id}`)
        const ses = porAlumnoLeccion.get(`${e.user.id}:${l.id}`)

        let estado: EstadoSesion
        if (ses?.completedAt) estado = 'terminada'
        else if (ses) estado = (avance.get(ses.id) ?? 0) > 0 ? 'a-medias' : 'sin-avanzar'
        else if (!programada) estado = 'no-programada'
        else if (cierre && cierre < ahora) estado = 'no-entro'
        else estado = 'pendiente'

        celdas[l.id] = {
          estado,
          grade: ses?.grade ?? null,
          minutos: ses
            ? Math.round((ses.lastActivityAt.getTime() - ses.startedAt.getTime()) / 60_000)
            : null,
          completedAt: ses?.completedAt ?? null,
        }
      }

      alumnos.push({
        userId: e.user.id,
        nombre: e.user.name ?? e.user.email,
        dni: e.user.dni,
        telefono: e.user.phone,
        seccion: sec.name,
        celdas,
      })
    }
  }

  // Una lección se muestra si la sección la programó O si alguien la hizo.
  // Filtrar solo por «programada» escondía actividad real: en IRQ hay alumnos
  // con S1 y S3 completas que esa sección nunca programó.
  const conActividad = new Set(sesiones.map((s) => s.lessonId))
  const visibles = lecciones.filter(
    (l) => seccionesConLeccion.has(l.id) || conActividad.has(l.id)
  )
  const idsVisibles = new Set(visibles.map((l) => l.id))

  // Las celdas se recortan a las columnas que se pintan, para que los totales
  // de arriba no cuenten lo que la matriz no muestra.
  for (const a of alumnos) {
    for (const k of Object.keys(a.celdas)) if (!idsVisibles.has(k)) delete a.celdas[k]
  }

  // Los que peor van, arriba: es la pregunta del martes («¿a quién llamo?»).
  const peso = (f: FilaAlumno) =>
    Object.values(f.celdas).filter((c) => c.estado === 'no-entro').length * 2 +
    Object.values(f.celdas).filter((c) => c.estado === 'sin-avanzar').length * 2 +
    Object.values(f.celdas).filter((c) => c.estado === 'a-medias').length
  alumnos.sort((a, b) => peso(b) - peso(a) || a.nombre.localeCompare(b.nombre))

  return {
    lecciones: visibles
      .map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        cierre: null,
        programadaEn: seccionesConLeccion.get(l.id) ?? 0,
      })),
    alumnos,
  }
}

export type ResumenCurso = {
  courseId: string
  titulo: string
  seccion: string
  hechas: number
  programadas: number
  faltas: number
}

/**
 * Los otros cursos del alumno, para la ficha del estudiante.
 *
 * Cuando llamás a alguien porque faltó a tutoría, lo primero que querés saber
 * es si también está fallando en el curso técnico. Sin esto había que acordarse
 * de ir a buscarlo curso por curso.
 *
 * Solo aparecen los cursos que quien mira puede ver: el alcance se aplica a las
 * secciones, igual que en todo lo demás.
 */
export async function otrosCursosDelAlumno(
  userId: string,
  alcanceSecciones: Prisma.SectionWhereInput,
  excluirCourseId: string,
  ahora = new Date()
): Promise<ResumenCurso[]> {
  const matriculas = await prisma.enrollment.findMany({
    where: {
      userId,
      section: {
        AND: [{ isArchived: false }, { courseId: { not: excluirCourseId } }, alcanceSecciones],
      },
    },
    select: {
      section: {
        select: {
          name: true,
          course: { select: { id: true, title: true } },
          schedules: { select: { lessonId: true, availableAt: true, closesAfterHours: true } },
        },
      },
    },
  })
  if (matriculas.length === 0) return []

  const lessonIds = [...new Set(matriculas.flatMap((m) => m.section.schedules.map((h) => h.lessonId)))]
  const sesiones = await prisma.lessonSession.findMany({
    where: { userId, isTest: false, lessonId: { in: lessonIds } },
    select: { lessonId: true, completedAt: true },
  })
  const terminadas = new Set(sesiones.filter((s) => s.completedAt).map((s) => s.lessonId))
  const abiertas = new Set(sesiones.map((s) => s.lessonId))

  return matriculas.map((m) => {
    const hs = m.section.schedules
    const faltas = hs.filter((h) => {
      if (abiertas.has(h.lessonId) || !h.availableAt) return false
      return new Date(h.availableAt.getTime() + h.closesAfterHours * 3_600_000) < ahora
    }).length
    return {
      courseId: m.section.course.id,
      titulo: m.section.course.title,
      seccion: m.section.name,
      hechas: hs.filter((h) => terminadas.has(h.lessonId)).length,
      programadas: hs.length,
      faltas,
    }
  })
}
