/**
 * Corpus de referencia — qué evidencia real tenemos para calibrar.
 *
 * Solo dos cursos importan como datos (decisión del 25 ago 2026):
 *   · Plan de Tutoría — activo, en producción.
 *   · Química aplicada a Procesos Metalúrgicos — terminado, corpus de referencia.
 * El resto quedó con deletedAt (reversible) por no aportar datos.
 *
 * Sirve para dimensionar los cursos nuevos: cuánto dura de verdad una actividad,
 * cuántos intentos toma un criterio, dónde se cae la gente.
 *
 * Uso: npx tsx scripts/corpus-report.ts
 */
import { prisma } from '../lib/prisma'

const CORPUS = [
  'plan-tutoria-induccion',
  'quimica-aplicada-a-procesos-metalurgicos',
]

async function main() {
  for (const slug of CORPUS) {
    const course = await prisma.course.findUnique({
      where: { slug },
      select: {
        title: true, methodology: true, deletedAt: true,
        lessons: { select: { id: true, title: true, order: true }, orderBy: { order: 'asc' } },
      },
    })
    if (!course) { console.log(`⚠️  no existe ${slug}\n`); continue }

    const lessonIds = course.lessons.map((l) => l.id)
    const sesiones = await prisma.lessonSession.findMany({
      where: { lessonId: { in: lessonIds }, isTest: false },
      select: { id: true, grade: true, completedAt: true, startedAt: true, lastActivityAt: true },
    })
    const mensajes = await prisma.message.count({
      where: { session: { lessonId: { in: lessonIds }, isTest: false } },
    })
    const alumnos = await prisma.lessonSession.findMany({
      where: { lessonId: { in: lessonIds }, isTest: false },
      select: { userId: true },
      distinct: ['userId'],
    })

    const conNota = sesiones.filter((s) => s.grade !== null)
    const promedio = conNota.length
      ? conNota.reduce((a, s) => a + (s.grade ?? 0), 0) / conNota.length
      : 0
    const terminadas = sesiones.filter((s) => s.completedAt).length
    const duraciones = sesiones
      .map((s) => (s.lastActivityAt.getTime() - s.startedAt.getTime()) / 60000)
      .filter((m) => m > 0 && m < 300)
      .sort((a, b) => a - b)
    const mediana = duraciones.length ? duraciones[Math.floor(duraciones.length / 2)] : 0

    console.log(`═══ ${course.title}${course.deletedAt ? '  [oculto]' : ''}`)
    console.log(`    methodology: ${course.methodology} · ${course.lessons.length} lecciones`)
    console.log(`    ${alumnos.length} estudiantes · ${sesiones.length} sesiones · ${mensajes} mensajes`)
    console.log(`    terminadas: ${terminadas}/${sesiones.length} · nota media: ${promedio.toFixed(1)} (n=${conNota.length})`)
    console.log(`    duración mediana de sesión: ${mediana.toFixed(0)} min`)

    // Intentos y nivel logrado por actividad: la señal para calibrar criterios
    const progreso = await prisma.activityProgress.groupBy({
      by: ['activityId'],
      where: { lessonSession: { lessonId: { in: lessonIds }, isTest: false } },
      _count: { _all: true },
      _avg: { attempts: true },
    })
    const aprobados = await prisma.activityProgress.groupBy({
      by: ['activityId'],
      where: { lessonSession: { lessonId: { in: lessonIds }, isTest: false }, passedCriteria: true },
      _count: { _all: true },
    })
    const okOf = new Map(aprobados.map((a) => [a.activityId, a._count._all]))

    console.log(`    ── actividades con más fricción (intentos promedio):`)
    const top = progreso
      .filter((p) => p._count._all >= 5)
      .sort((a, b) => (b._avg.attempts ?? 0) - (a._avg.attempts ?? 0))
      .slice(0, 5)
    for (const p of top) {
      const ok = okOf.get(p.activityId) ?? 0
      const pct = Math.round((ok / p._count._all) * 100)
      console.log(`       ${p.activityId.padEnd(14)} ${(p._avg.attempts ?? 0).toFixed(1)} intentos · ${pct}% cumplió criterios · n=${p._count._all}`)
    }
    console.log('')
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
