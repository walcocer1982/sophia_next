import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SectionsManager } from '@/components/admin/sections-manager'

export default async function SectionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || user.role === 'STUDENT') redirect('/lessons')

  // Fetch periods
  const periods = await prisma.academicPeriod.findMany({
    orderBy: { name: 'desc' },
    include: { _count: { select: { sections: true } } },
  })

  // Fetch courses (all for SUPERADMIN, own for ADMIN)
  const courses = await prisma.course.findMany({
    where: {
      deletedAt: null,
      ...(user.role === 'SUPERADMIN' ? {} : { userId: session.user.id }),
    },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      userId: true,
      career: { select: { name: true } },
    },
  })

  // Fetch sections with enrollments and instructors
  const sections = await prisma.section.findMany({
    where: {
      course: {
        deletedAt: null,
        ...(user.role === 'SUPERADMIN' ? {} : { userId: session.user.id }),
      },
    },
    orderBy: [{ period: { name: 'desc' } }, { course: { title: 'asc' } }, { name: 'asc' }],
    include: {
      period: { select: { id: true, name: true } },
      course: { select: { id: true, title: true, career: { select: { name: true } } } },
      instructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  })

  // Fetch available instructors (ADMIN/SUPERADMIN users)
  const instructors = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true },
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Gestión de Secciones
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Administra periodos académicos, secciones e instructores
      </p>

      <SectionsManager
        periods={periods}
        courses={courses}
        sections={sections}
        instructors={instructors}
        isSuperAdmin={user.role === 'SUPERADMIN'}
      />
    </div>
  )
}
