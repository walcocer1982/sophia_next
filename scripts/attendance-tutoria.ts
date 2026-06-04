/**
 * Reporte de asistencia del curso Tutoría:
 * Por día, por sesión, listado de estudiantes con cuántas actividades
 * completaron sobre el total. Excluye a Hannah, Walther, Giuliana.
 *
 * Output: estudiante, sede (si existe), sesión, estado (X/Y completadas).
 *
 * Uso: npx tsx scripts/attendance-tutoria.ts
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

const EXCLUDED_NAMES = ['hannah', 'walther', 'giuliana']

function isExcluded(name: string | null): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return EXCLUDED_NAMES.some((ex) => lower.includes(ex))
}

async function main() {
  // 1) Buscar el curso de Tutoría
  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { title: { contains: 'Tutor', mode: 'insensitive' } },
        { title: { contains: 'tutoria', mode: 'insensitive' } },
        { title: { contains: 'Inducción', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      lessons: {
        select: { id: true, title: true, order: true, contentJson: true },
        orderBy: { order: 'asc' },
      },
      sections: {
        select: { id: true, name: true, period: { select: { name: true } } },
      },
    },
  })

  if (!course) {
    console.error('No se encontró curso de Tutoría')
    process.exit(1)
  }

  console.log(`\n📚 Curso: ${course.title}`)
  console.log(`   Lecciones: ${course.lessons.length}`)
  console.log(`   Secciones: ${course.sections.map((s) => s.name).join(', ') || '(sin secciones)'}\n`)

  // 2) Total de actividades por lección
  const lessonTotals = new Map<string, { title: string; total: number; order: number }>()
  for (const l of course.lessons) {
    const c = l.contentJson as unknown as LessonContent | null
    const totalActs = c?.activities?.length ?? 0
    lessonTotals.set(l.id, { title: l.title, total: totalActs, order: l.order })
  }

  // 3) Traer todas las sesiones del curso
  const sessions = await prisma.lessonSession.findMany({
    where: {
      lesson: { courseId: course.id },
      isTest: false,
    },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      lastActivityAt: true,
      lessonId: true,
      sectionId: true,
      user: { select: { id: true, name: true, email: true } },
      activities: { select: { activityId: true, status: true } },
    },
    orderBy: { startedAt: 'asc' },
  })

  console.log(`Total sesiones (sin excluir): ${sessions.length}`)

  // Mapa de sectionId → name (para sede)
  const sectionMap = new Map(course.sections.map((s) => [s.id, s.name]))

  // 4) Filtrar excluidos
  const filtered = sessions.filter((s) => !isExcluded(s.user.name))
  console.log(`Tras excluir Hannah/Walther/Giuliana: ${filtered.length}\n`)

  // 5) Agrupar por día → por sesión (lección) → estudiantes
  type Row = {
    date: string
    student: string
    sede: string
    lessonTitle: string
    lessonOrder: number
    completed: number
    total: number
    sessionState: string
    startedAt: Date
  }
  const rows: Row[] = []

  for (const s of filtered) {
    const lt = lessonTotals.get(s.lessonId)
    if (!lt) continue
    const completed = s.activities.filter((a) => a.status === 'COMPLETED').length
    const total = lt.total
    const sedeRaw = s.sectionId ? sectionMap.get(s.sectionId) : null
    const sede = sedeRaw || '—'
    const isDone = !!s.completedAt
    const sessionState = isDone
      ? `✅ Terminó (${completed}/${total})`
      : completed === total && total > 0
      ? `✓ Todas completas (${completed}/${total}) — sin endedAt`
      : `⏳ ${completed}/${total}`

    rows.push({
      date: s.startedAt.toISOString().slice(0, 10),
      student: s.user.name ?? s.user.email,
      sede,
      lessonTitle: lt.title.length > 60 ? lt.title.slice(0, 57) + '…' : lt.title,
      lessonOrder: lt.order,
      completed,
      total,
      sessionState,
      startedAt: s.startedAt,
    })
  }

  // Ordenar por fecha → lección → estudiante
  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.lessonOrder !== b.lessonOrder) return a.lessonOrder - b.lessonOrder
    return a.student.localeCompare(b.student)
  })

  // 6) Imprimir agrupado por día + sesión
  if (rows.length === 0) {
    console.log('Sin sesiones registradas tras filtros.')
    await prisma.$disconnect()
    return
  }

  let currentDate = ''
  let currentLesson = ''
  for (const r of rows) {
    if (r.date !== currentDate) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📅 ${r.date}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      currentDate = r.date
      currentLesson = ''
    }
    if (r.lessonTitle !== currentLesson) {
      console.log(`\n  📖 ${r.lessonTitle}`)
      currentLesson = r.lessonTitle
    }
    console.log(`     ${r.student.padEnd(35)}  sede: ${r.sede.padEnd(15)}  ${r.sessionState}`)
  }

  // 7) Resumen
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 RESUMEN`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  const uniqueStudents = new Set(rows.map((r) => r.student))
  const dayCount = new Set(rows.map((r) => r.date)).size
  const completedSessions = rows.filter((r) => r.sessionState.startsWith('✅')).length
  console.log(`Total sesiones: ${rows.length}`)
  console.log(`Sesiones terminadas: ${completedSessions} (${Math.round((completedSessions / rows.length) * 100)}%)`)
  console.log(`Estudiantes distintos: ${uniqueStudents.size}`)
  console.log(`Días con actividad: ${dayCount}`)
  console.log()

  // Tabla por estudiante: cuántas lecciones terminó
  console.log(`\nAsistencia por estudiante (lecciones terminadas / lecciones intentadas):`)
  const perStudent = new Map<string, { done: number; tried: number; sede: string }>()
  for (const r of rows) {
    const cur = perStudent.get(r.student) || { done: 0, tried: 0, sede: r.sede }
    cur.tried++
    if (r.sessionState.startsWith('✅')) cur.done++
    perStudent.set(r.student, cur)
  }
  const sorted = Array.from(perStudent.entries()).sort((a, b) => b[1].done - a[1].done)
  for (const [student, st] of sorted) {
    console.log(`   ${student.padEnd(35)}  sede: ${st.sede.padEnd(15)}  ${st.done}/${st.tried} terminadas`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
