/**
 * Configura el primer despliegue del curso "Plan de Tutoría":
 *  - Periodo académico 2026-1 (lo crea si no existe)
 *  - Sección "Tutoría" en ese periodo
 *  - Erick Salazar como instructor de la sección
 *  - Curso publicado (isPublished=true)
 *  - Solo S2 publicada; S1/S3/S4 quedan en borrador
 *  - Jhoan Dionisio matriculado en la sección
 *
 * Idempotente: si algo ya existe, lo reutiliza.
 */
import { prisma } from '../lib/prisma'

const PERIOD_NAME = '2026-1'
const SECTION_NAME = 'Tutoría'
const COURSE_SLUG = 'plan-tutoria-induccion-cetemin-abq'
const INSTRUCTOR_EMAIL = 'ericksalazarsanchez@gmail.com'
const STUDENT_EMAIL = 'dionisiojhoan45@gmail.com'

async function main() {
  // 1. Periodo
  const period = await prisma.academicPeriod.upsert({
    where: { name: PERIOD_NAME },
    update: { isActive: true },
    create: { name: PERIOD_NAME, isActive: true },
  })
  console.log(`✓ Periodo: ${period.name} (${period.id}) — activo: ${period.isActive}`)

  // 2. Curso
  const course = await prisma.course.findFirst({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, isPublished: true },
  })
  if (!course) throw new Error(`Curso no encontrado: ${COURSE_SLUG}`)

  if (!course.isPublished) {
    await prisma.course.update({ where: { id: course.id }, data: { isPublished: true } })
    console.log(`✓ Curso publicado: ${course.title}`)
  } else {
    console.log(`= Curso ya estaba publicado: ${course.title}`)
  }

  // 3. Sección
  const section = await prisma.section.upsert({
    where: {
      courseId_periodId_name: {
        courseId: course.id,
        periodId: period.id,
        name: SECTION_NAME,
      },
    },
    update: {},
    create: { courseId: course.id, periodId: period.id, name: SECTION_NAME },
    select: { id: true, name: true },
  })
  console.log(`✓ Sección: ${section.name} (${section.id})`)

  // 4. Erick como instructor
  const erick = await prisma.user.findUnique({
    where: { email: INSTRUCTOR_EMAIL },
    select: { id: true, name: true, role: true },
  })
  if (!erick) throw new Error(`Instructor no encontrado: ${INSTRUCTOR_EMAIL}`)
  await prisma.sectionInstructor.upsert({
    where: { userId_sectionId: { userId: erick.id, sectionId: section.id } },
    update: {},
    create: { userId: erick.id, sectionId: section.id },
  })
  console.log(`✓ Erick (${erick.name}) asignado como instructor de la sección`)

  // 5. Lecciones — solo S2 publicada
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    select: { id: true, title: true, isPublished: true, slug: true, order: true },
    orderBy: { order: 'asc' },
  })
  for (const l of lessons) {
    const shouldBePublished = l.slug === 's2-tu-equipo-trabaja-contigo'
    if (l.isPublished !== shouldBePublished) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { isPublished: shouldBePublished },
      })
      console.log(`  ${shouldBePublished ? '✓ Publicada' : '↩ Despublicada'}: ${l.title}`)
    } else {
      console.log(`  = ${l.isPublished ? 'Publicada' : 'Borrador'} (sin cambios): ${l.title}`)
    }
  }

  // 6. Jhoan matriculado en la sección
  const jhoan = await prisma.user.findUnique({
    where: { email: STUDENT_EMAIL },
    select: { id: true, name: true, role: true },
  })
  if (!jhoan) throw new Error(`Estudiante no encontrado: ${STUDENT_EMAIL}`)
  await prisma.enrollment.upsert({
    where: { userId_sectionId: { userId: jhoan.id, sectionId: section.id } },
    update: {},
    create: { userId: jhoan.id, sectionId: section.id },
  })
  console.log(`✓ Jhoan (${jhoan.name}) matriculado en la sección`)

  console.log('\n=== TERMINADO ===')
  console.log(`Curso "${course.title}" listo:`)
  console.log(`  - Periodo: ${period.name}`)
  console.log(`  - Sección: ${section.name}`)
  console.log(`  - Instructor: ${erick.name}`)
  console.log(`  - Estudiante matriculado: ${jhoan.name}`)
  console.log(`  - Lección visible al estudiante: S2 (las demás en borrador)`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
