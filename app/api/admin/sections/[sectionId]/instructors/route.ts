import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'

// POST /api/admin/sections/[sectionId]/instructors — Assign instructor to section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params
  const { userId } = (await request.json()) as { userId: string }

  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  // Verify section exists and user has access to the course
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

  // Verify target user is ADMIN
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!targetUser || (targetUser.role !== 'ADMIN' && targetUser.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'El usuario debe ser instructor' }, { status: 400 })
  }

  const assignment = await prisma.sectionInstructor.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    create: { userId, sectionId },
    update: {},
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(assignment, { status: 201 })
}

// DELETE /api/admin/sections/[sectionId]/instructors — Remove instructor from section
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

  await prisma.sectionInstructor.deleteMany({
    where: { userId, sectionId },
  })

  return NextResponse.json({ success: true })
}
