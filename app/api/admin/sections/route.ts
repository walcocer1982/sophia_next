import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'

// GET /api/admin/sections?courseId=xxx — List sections for a course
export async function GET(request: Request) {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
  }

  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: [{ period: { name: 'desc' } }, { name: 'asc' }],
    include: {
      period: { select: { id: true, name: true } },
      instructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  })

  return NextResponse.json(sections)
}

// POST /api/admin/sections — Create a section (SUPERADMIN or course lead)
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId, periodId, name } = (await request.json()) as {
    courseId: string
    periodId: string
    name: string
  }

  if (!courseId || !periodId || !name?.trim()) {
    return NextResponse.json({ error: 'courseId, periodId y nombre requeridos' }, { status: 400 })
  }

  // Verify course exists and user has access
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { userId: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Check duplicate
  const existing = await prisma.section.findUnique({
    where: { courseId_periodId_name: { courseId, periodId, name: name.trim() } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Esta sección ya existe' }, { status: 409 })
  }

  const section = await prisma.section.create({
    data: {
      courseId,
      periodId,
      name: name.trim(),
    },
    include: {
      period: { select: { name: true } },
    },
  })

  return NextResponse.json(section, { status: 201 })
}
