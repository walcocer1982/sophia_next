import { prisma } from '../lib/prisma'

async function main() {
  // 1. Buscar el curso transversal de tutoría
  const course = await prisma.course.findFirst({
    where: {
      title: { contains: 'Tutoría', mode: 'insensitive' },
      scope: 'TRANSVERSAL',
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true },
      },
    },
  })
  if (!course) {
    console.log('❌ No se encontró curso transversal de tutoría')
    return
  }
  console.log(`\n📘 Curso: ${course.title} (${course.id})`)
  console.log('  Lecciones:')
  course.lessons.forEach((l) => console.log(`   ${l.order}. ${l.title} (${l.id})`))

  // 2. Buscar la lección "Técnicas de lectura técnica"
  const lesson = course.lessons.find((l) =>
    l.title.toLowerCase().includes('lectura técnica') || l.title.toLowerCase().includes('lectura tecnica')
  )
  if (!lesson) {
    console.log('\n❌ No se encontró la lección "Técnicas de lectura técnica"')
    return
  }
  console.log(`\n🎯 Lección target: "${lesson.title}" (${lesson.id})`)

  // 3. Buscar secciones del curso en sede ABQ
  const sections = await prisma.section.findMany({
    where: {
      courseId: course.id,
      isArchived: false,
      sede: { code: 'ABQ' },
    },
    include: {
      sede: { select: { code: true } },
      period: { select: { name: true, isActive: true } },
      schedules: {
        where: { lessonId: lesson.id },
        select: { availableAt: true, closesAfterHours: true },
      },
    },
  })
  console.log(`\n📍 Secciones ABQ activas: ${sections.length}`)
  sections.forEach((s) => {
    const sch = s.schedules[0]
    console.log(
      `   - ${s.name} [${s.sede?.code}] período ${s.period.name} (activo: ${s.period.isActive})` +
      `\n     schedule actual de esa lección: ${sch?.availableAt ? sch.availableAt.toISOString() + ' / ' + sch.closesAfterHours + 'h' : 'NO programada'}`
    )
    console.log(`     sectionId: ${s.id}`)
  })
}

main().finally(() => prisma.$disconnect())
