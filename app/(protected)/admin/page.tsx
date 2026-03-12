import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { UserTable } from '@/components/admin/user-table'
import { CareerManager } from '@/components/admin/career-manager'

type UserRow = {
  id: string
  name: string | null
  email: string
  role: string
  careerId: string | null
  careerName: string | null
  createdAt: string
}

type CareerRow = {
  id: string
  name: string
  slug: string
  _count: { users: number; courses: number }
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPERADMIN') redirect('/lessons')

  const [dbUsers, dbCareers] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        careerId: true,
        career: { select: { name: true } },
        createdAt: true,
        _count: { select: { lessonSessions: true, courses: true } },
      },
    }),
    prisma.career.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { users: true, courses: true } },
      },
    }),
  ])

  const users: UserRow[] = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    careerId: u.careerId,
    careerName: u.career?.name || null,
    createdAt: u.createdAt.toISOString(),
  }))

  const careers: CareerRow[] = dbCareers.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    _count: c._count,
  }))

  const stats = {
    total: dbUsers.length,
    students: dbUsers.filter((u) => u.role === 'STUDENT').length,
    admins: dbUsers.filter((u) => u.role === 'ADMIN').length,
    superadmins: dbUsers.filter((u) => u.role === 'SUPERADMIN').length,
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="mb-1 text-3xl font-bold">Administración</h1>
        <p className="text-muted-foreground">Gestión de usuarios, roles y carreras</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Total usuarios</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
          <p className="text-sm text-gray-500">Estudiantes</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.admins}</p>
          <p className="text-sm text-gray-500">Instructores</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-2xl font-bold text-red-600">{stats.superadmins}</p>
          <p className="text-sm text-gray-500">Super Admins</p>
        </div>
      </div>

      {/* Careers */}
      <div className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Carreras</h2>
        <CareerManager careers={careers} />
      </div>

      {/* User Table */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Usuarios</h2>
        <UserTable users={users} currentUserId={session.user.id} careers={careers} />
      </div>
    </div>
  )
}
