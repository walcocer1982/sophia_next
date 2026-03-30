import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'

// GET /api/admin/sections/[sectionId]/enrollments — List students in section
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId },
    orderBy: { user: { name: 'asc' } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return NextResponse.json(enrollments)
}

// POST /api/admin/sections/[sectionId]/enrollments — Enroll student(s) in section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params
  const { userIds } = (await request.json()) as { userIds: string[] }

  if (!userIds?.length) {
    return NextResponse.json({ error: 'userIds requeridos' }, { status: 400 })
  }

  // Verify section exists and user has access
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { userId: true } } },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, section.course.userId)) {
    // Also allow section instructors
    const isSectionInstructor = await prisma.sectionInstructor.findUnique({
      where: { userId_sectionId: { userId: session.user.id, sectionId } },
    })
    if (!isSectionInstructor) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  // Bulk upsert enrollments
  const results = await Promise.all(
    userIds.map(userId =>
      prisma.enrollment.upsert({
        where: { userId_sectionId: { userId, sectionId } },
        create: { userId, sectionId },
        update: {},
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    )
  )

  return NextResponse.json({ enrolled: results.length, enrollments: results }, { status: 201 })
}

// DELETE /api/admin/sections/[sectionId]/enrollments — Remove student from section
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params
  const { userId } = (await request.json()) as { userId: string }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { userId: true } } },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, section.course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.enrollment.deleteMany({
    where: { userId, sectionId },
  })

  return NextResponse.json({ success: true })
}
