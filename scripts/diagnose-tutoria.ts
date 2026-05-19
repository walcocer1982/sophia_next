import { prisma } from '../lib/prisma'

async function main() {
  console.log('=== 1. Erick Salazar — todas las cuentas ===')
  const erick = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'erick', mode: 'insensitive' } },
        { email: { contains: 'salazar', mode: 'insensitive' } },
        { name: { contains: 'erick salazar', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, email: true, name: true, role: true,
      careerId: true, career: { select: { name: true } },
      googleId: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(JSON.stringify(erick, null, 2))

  console.log('\n=== 2. dionisiojhoan45@gmail.com — todas las cuentas ===')
  const dio = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'dionisio', mode: 'insensitive' } },
        { email: { contains: 'jhoan', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, email: true, name: true, role: true,
      careerId: true, career: { select: { name: true } },
      googleId: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(JSON.stringify(dio, null, 2))

  console.log('\n=== 3. Curso de Tutoría — estado ===')
  const course = await prisma.course.findFirst({
    where: { slug: 'plan-tutoria-induccion-cetemin-abq' },
    select: {
      id: true, title: true, isPublished: true,
      userId: true, careerId: true, deletedAt: true,
      user: { select: { email: true, name: true } },
      career: { select: { name: true } },
      lessons: { select: { id: true, title: true, isPublished: true, order: true }, orderBy: { order: 'asc' } },
      sections: { select: { id: true, name: true, period: { select: { name: true, isActive: true } }, _count: { select: { enrollments: true } } } },
    },
  })
  console.log(JSON.stringify(course, null, 2))

  console.log('\n=== 4. Carrera Tutoría — usuarios asignados ===')
  const tutoria = await prisma.career.findFirst({
    where: { name: 'Tutoría' },
    select: {
      id: true, name: true,
      _count: { select: { users: true, courses: true } },
      users: { select: { id: true, email: true, name: true, role: true } },
    },
  })
  console.log(JSON.stringify(tutoria, null, 2))

  console.log('\n=== 5. Enrollments en cursos de Tutoría ===')
  if (course) {
    const enrollments = await prisma.enrollment.findMany({
      where: { section: { courseId: course.id } },
      select: {
        userId: true,
        user: { select: { email: true, name: true } },
        section: { select: { name: true, period: { select: { name: true } } } },
      },
    })
    console.log(JSON.stringify(enrollments, null, 2))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
