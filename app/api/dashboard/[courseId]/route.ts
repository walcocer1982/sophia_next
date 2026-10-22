import { NextResponse } from 'next/server'
import { tituloActividad } from '@/lib/actividad-titulo'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { checkAndGeneratePartialReports } from '@/lib/lesson-report'
import { calculateRubricLevel, calculateOverallRubric, type RubricLevel } from '@/lib/rubric'
import { calculateGrade, enriquecerConPlan, type ActividadDelPlan, type ProgresoGuardado } from '@/lib/grading'
import { normalizeLevel, LEGACY_LABEL } from '@/lib/levels'
import { logger } from '@/lib/logger'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { formatDate, formatTime } from '@/lib/formatters'
import { ultimaMarcaPorAlumno, resumenDeMarca, type Marca } from '@/lib/seguimiento'
import { cierreDeHorario,
  atendido,
  avisoDeIntentos,
  cierreDeVentana,
  estadoDeSesion,
  pasoDelEmbudo,
  representativa,
  type ProgresoEmbudo,
  type SesionDeEmbudo,
} from '@/lib/monitor'
import type { LessonContent } from '@/types/lesson'
import type {
  EmbudoLeccion,
  FilaMonitor,
  LeccionPendiente,
  MarcaDTO,
  PendienteMonitor,
  RespuestaMonitor,
} from '@/types/monitor'

export const runtime = 'nodejs'

/**
 * Monitor por curso (15 oct 2026).
 *
 * - Alcance por SECCIÓN, igual que la matriz y la ficha (`lib/alcance.ts`):
 *   el instructor ve sus secciones; antes la ruta exigía ADMIN y el rol
 *   INSTRUCTOR recibía 403 con la pantalla en blanco.
 * - Un solo estado por sesión, derivado de la ventana (`lib/monitor.ts`).
 *   Este GET ya no escribe `endedAt`: hacerlo desde una lectura que cada
 *   pestaña repetía cada 15 s mataba sesiones que el alumno aún podía retomar.
 * - Las alertas son «pendientes de llamar»: lo que quedó sin terminar o sin
 *   abrir con la ventana cerrada y sin marca de seguimiento posterior.
 * - El embudo respeta el filtro de sección y mide el cuello de botella sobre
 *   los que llegaron a la actividad.
 */

type ProgresoConEstado = ProgresoGuardado & { status: string; completedAt: Date | null }
type PlanPorActividad = Map<string, ActividadDelPlan>

type Evidencia = {
  attempts?: Array<{
    analysis?: { criteriaMissing?: string[]; understanding_level?: string }
  }>
} | null

function completadasConPlan(activities: ProgresoConEstado[], plan: PlanPorActividad) {
  return activities
    .filter((a) => a.status === 'COMPLETED')
    .map((a) => enriquecerConPlan(a, plan.get(a.activityId)))
}

function notaParcial(activities: ProgresoConEstado[], plan: PlanPorActividad): number | null {
  const completed = completadasConPlan(activities, plan)
  if (completed.length === 0) return null
  return calculateGrade(completed)
}

function nivelDeSesion(activities: ProgresoConEstado[], plan: PlanPorActividad): RubricLevel | null {
  const levels = completadasConPlan(activities, plan)
    .map((ap) => calculateRubricLevel(ap))
    .filter((l): l is RubricLevel => l !== null)
  return levels.length ? calculateOverallRubric(levels) : null
}

function progresoEmbudo(a: ProgresoConEstado): ProgresoEmbudo {
  const ultimo = (a.evidenceData as Evidencia)?.attempts?.at(-1)
  const nivel = ultimo?.analysis?.understanding_level
  return {
    status: a.status,
    attempts: a.attempts,
    passedCriteria: a.passedCriteria ?? null,
    nivel: nivel ? LEGACY_LABEL[normalizeLevel(nivel)] : null,
    faltantes: ultimo?.analysis?.criteriaMissing ?? [],
  }
}

function aDTO(m: Marca | null | undefined): MarcaDTO | null {
  if (!m) return null
  return { estado: m.estado, texto: resumenDeMarca(m, formatDate), autor: m.autor, fecha: m.fecha.toISOString() }
}

const ORDEN_ESTADO = { activa: 0, 'en-pausa': 1, 'sin-terminar': 2, terminada: 3 } as const

// Los reportes parciales se generan con el modelo. Este GET los dispara, pero
// una vez cada cinco minutos por curso e instancia: antes salían en cada
// sondeo de cada pestaña y dos Monitores abiertos pedían el mismo reporte.
const ultimoDisparoDeReportes = new Map<string, number>()
const CADA_MS = 5 * 60_000

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const result = await requireRole('INSTRUCTOR')
  if (result instanceof NextResponse) return result

  const { courseId } = await params
  const filterSectionId = new URL(request.url).searchParams.get('sectionId')
  const ahora = new Date()

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      career: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
  })
  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  const { alcance, viendoComo } = await alcanceEfectivo(result)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const secciones = await prisma.section.findMany({
    where: { AND: [{ courseId }, { isArchived: false }, filtro] },
    orderBy: [{ period: { name: 'desc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      period: { select: { name: true } },
      enrollments: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      schedules: { select: { lessonId: true, availableAt: true, closesAfterHours: true, closedAt: true } },
    },
  })
  if (secciones.length === 0 && alcance.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { error: 'Ninguna sección de este curso está a tu alcance' },
      { status: 403 }
    )
  }
  if (filterSectionId && !secciones.some((s) => s.id === filterSectionId)) {
    return NextResponse.json({ error: 'Esa sección no está a tu alcance' }, { status: 403 })
  }
  const activas = filterSectionId ? secciones.filter((s) => s.id === filterSectionId) : secciones

  // Alumno → su sección (la primera que lo tenga) y datos de contacto.
  const alumnos = new Map<
    string,
    { user: { id: string; name: string | null; email: string | null; phone: string | null }; sectionId: string }
  >()
  for (const s of activas) {
    for (const e of s.enrollments) {
      if (!alumnos.has(e.userId)) alumnos.set(e.userId, { user: e.user, sectionId: s.id })
    }
  }
  const userIds = [...alumnos.keys()]

  // Cierre por (sección, lección). Si la sección no programó la lección, la
  // clave no existe y se cae al horario de la lección.
  const cierrePorSeccion = new Map<string, Date | null>()
  for (const s of activas) {
    for (const h of s.schedules) {
      cierrePorSeccion.set(`${s.id}:${h.lessonId}`, cierreDeHorario(h))
    }
  }
  const abiertos = activas.flatMap((s) =>
    s.schedules
      .map((h) => ({ s, h, cierre: cierreDeHorario(h) }))
      .filter(({ h, cierre }) => !!h.availableAt && !!cierre && h.availableAt <= ahora && ahora < cierre)
  )
  const enVivo = abiertos.length > 0

  const lessons = await prisma.lesson.findMany({
    where: {
      courseId,
      OR: [{ isPublished: true }, { sessions: { some: { isTest: false } } }],
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      contentJson: true,
      availableAt: true,
      closesAfterHours: true,
      sessions: {
        where: { isTest: false, userId: { in: userIds } },
        select: {
          id: true,
          userId: true,
          completedAt: true,
          grade: true,
          startedAt: true,
          lastActivityAt: true,
          activityId: true,
          progress: true,
          activities: {
            select: {
              activityId: true,
              status: true,
              attempts: true,
              tangentCount: true,
              completedAt: true,
              evidenceData: true,
              passedCriteria: true,
            },
          },
          _count: { select: { messages: { where: { role: 'user' } } } },
        },
      },
    },
  })
  const marcas = await ultimaMarcaPorAlumno(userIds)

  const filas: FilaMonitor[] = []
  const pendientes = new Map<string, PendienteMonitor>()
  const funnels: EmbudoLeccion[] = []

  const agregarPendiente = (userId: string, leccion: LeccionPendiente) => {
    const alumno = alumnos.get(userId)
    if (!alumno) return
    let p = pendientes.get(userId)
    if (!p) {
      p = {
        userId,
        name: alumno.user.name,
        email: alumno.user.email,
        phone: alumno.user.phone,
        seguimiento: aDTO(marcas.get(userId)),
        lecciones: [],
      }
      pendientes.set(userId, p)
    }
    p.lecciones.push(leccion)
  }

  for (const lesson of lessons) {
    const content = lesson.contentJson as LessonContent | null
    const actividades = content?.activities ?? []
    const plan: PlanPorActividad = new Map(actividades.map((a) => [a.id, a as ActividadDelPlan]))
    const total = actividades.length

    const porAlumno = new Map<string, typeof lesson.sessions>()
    for (const s of lesson.sessions) {
      const lista = porAlumno.get(s.userId)
      if (lista) lista.push(s)
      else porAlumno.set(s.userId, [s])
    }
    const sesionesEmbudo: SesionDeEmbudo[] = []

    for (const [userId, lista] of porAlumno) {
      const s = representativa(lista)
      const alumno = alumnos.get(userId)
      if (!s || !alumno) continue
      const clave = `${alumno.sectionId}:${lesson.id}`
      const cierre = cierrePorSeccion.has(clave)
        ? (cierrePorSeccion.get(clave) ?? null)
        : cierreDeVentana(lesson.availableAt, lesson.closesAfterHours)
      const completadas = s.activities.filter((a) => a.status === 'COMPLETED')
      const { estado, avance } = estadoDeSesion(
        { completedAt: s.completedAt, lastActivityAt: s.lastActivityAt, completadas: completadas.length },
        cierre,
        ahora
      )
      const idx = actividades.findIndex((a) => a.id === s.activityId)
      const actual = s.activities.find((a) => a.activityId === s.activityId)
      const ultimo = (actual?.evidenceData as Evidencia)?.attempts?.at(-1)
      const maximo = (s.activityId && plan.get(s.activityId)?.verification?.max_attempts) || 3
      const porLimite = completadas
        .filter((a) => a.passedCriteria === false)
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]
      const porLimiteIdx = porLimite ? actividades.findIndex((a) => a.id === porLimite.activityId) : -1
      const marca = marcas.get(userId) ?? null

      filas.push({
        userId,
        name: alumno.user.name,
        email: alumno.user.email,
        sessionId: s.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        estado,
        avance,
        activityIndex: idx >= 0 ? idx + 1 : null,
        activityTotal: total || null,
        activityTitle: idx >= 0 ? tituloActividad(actividades[idx], idx) : null,
        // `LessonSession.progress` solo se escribe al terminar (100): en vivo
        // marcaba 0 % con cinco actividades hechas. Se cuenta lo completado.
        percentage: total ? Math.round((completadas.length / total) * 100) : (s.progress ?? 0),
        startedAt: s.startedAt.toISOString(),
        lastActivityAt: s.lastActivityAt.toISOString(),
        cierre: cierre?.toISOString() ?? null,
        minutos: Math.round((s.lastActivityAt.getTime() - s.startedAt.getTime()) / 60_000),
        messageCount: s._count.messages,
        grade: s.grade ?? notaParcial(s.activities, plan),
        nivel: nivelDeSesion(s.activities, plan),
        intentos:
          actual && estado !== 'terminada'
            ? { actuales: actual.attempts, maximo, aviso: avisoDeIntentos(actual.attempts, maximo) }
            : null,
        criterioFaltante: ultimo?.analysis?.criteriaMissing?.[0] ?? null,
        porLimite:
          porLimiteIdx >= 0
            ? { index: porLimiteIdx + 1, title: tituloActividad(actividades[porLimiteIdx], porLimiteIdx) }
            : null,
        lecturaSinComprobar: completadas
          .filter((a) => (a.evidenceData as { lecturaNoComprobada?: boolean } | null)?.lecturaNoComprobada === true)
          .map((a) => actividades.findIndex((x) => x.id === a.activityId))
          .filter((i) => i >= 0)
          .sort((x, y) => x - y)
          .map((i) => ({ index: i + 1, title: tituloActividad(actividades[i], i) })),
        seguimiento: aDTO(marca),
      })

      if (estado === 'sin-terminar' && avance && !atendido(marca, s.lastActivityAt)) {
        agregarPendiente(userId, {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          estado: avance,
          fecha: s.lastActivityAt.toISOString(),
          activityIndex: idx >= 0 ? idx + 1 : null,
          activityTotal: total || null,
        })
      }

      sesionesEmbudo.push({
        userId,
        completedAt: s.completedAt,
        punteroIdx: idx,
        progresos: new Map(s.activities.map((a) => [a.activityId, progresoEmbudo(a)])),
      })
    }

    // «No entró»: matriculado en una sección que programó la lección, ventana
    // cerrada y ninguna sesión. Es la fila que el Monitor nunca tuvo.
    for (const [userId, alumno] of alumnos) {
      if (porAlumno.has(userId)) continue
      const cierre = cierrePorSeccion.get(`${alumno.sectionId}:${lesson.id}`)
      if (!cierre || cierre > ahora) continue
      if (atendido(marcas.get(userId), cierre)) continue
      agregarPendiente(userId, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        estado: 'no-entro',
        fecha: cierre.toISOString(),
        activityIndex: null,
        activityTotal: null,
      })
    }

    funnels.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalStudents: porAlumno.size,
      funnel: actividades.map((act, i) => {
        const paso = pasoDelEmbudo(i, act.id, sesionesEmbudo)
        return {
          id: act.id,
          index: i + 1,
          title: tituloActividad(act, i),
          total: porAlumno.size,
          percentage: porAlumno.size ? Math.round((paso.completadas / porAlumno.size) * 100) : 0,
          ...paso,
        }
      }),
    })
  }

  filas.sort(
    (a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
      b.lastActivityAt.localeCompare(a.lastActivityAt)
  )

  const ultimo = ultimoDisparoDeReportes.get(courseId) ?? 0
  if (Date.now() - ultimo > CADA_MS) {
    ultimoDisparoDeReportes.set(courseId, Date.now())
    checkAndGeneratePartialReports(courseId)
      .then((count) => {
        if (count > 0) logger.info('dashboard.partial_reports_generated', { courseId, count })
      })
      .catch((err: unknown) => {
        logger.error('dashboard.partial_reports_failed', { courseId, error: String(err) })
      })
  }

  const respuesta: RespuestaMonitor = {
    course: {
      id: course.id,
      title: course.title,
      career: course.career,
      instructor: course.user?.name || 'Sin instructor',
    },
    viendoComo,
    sections: secciones.map((s) => ({
      id: s.id,
      name: s.name,
      period: s.period,
      _count: { enrollments: s.enrollments.length },
    })),
    enVivo,
    // La hora va formateada desde el servidor: así se ve igual que en la matriz.
    bloquesAbiertos: abiertos.map(({ s, h, cierre }) => {
      const l = lessons.find((x) => x.id === h.lessonId)
      return {
        sectionId: s.id,
        sectionName: s.name,
        lessonId: h.lessonId,
        lessonOrder: l?.order ?? 0,
        lessonTitle: l?.title ?? '',
        cierra: formatTime(cierre!),
      }
    }),
    filas,
    pendientes: [...pendientes.values()].sort((a, b) => b.lecciones.length - a.lecciones.length),
    funnels,
  }
  return NextResponse.json(respuesta)
}
