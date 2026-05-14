import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/admin/assessments/[id]
 * Get assessment details and all participants with scores.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      lesson: { select: { title: true, courseId: true } },
      participants: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          startedAt: true,
          completedAt: true,
          grade: true,
          gradeOver20: true,
          passed: true,
        },
      },
    },
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only the creator or SUPERADMIN can see this
  if (assessment.createdById !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ assessment })
}

/**
 * PATCH /api/admin/assessments/[id]
 * Toggle active state or update assessment settings.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json()

  const assessment = await prisma.assessment.findUnique({ where: { id } })
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (assessment.createdById !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updateData: { isActive?: boolean; closedAt?: Date | null } = {}
  if (typeof body.isActive === 'boolean') {
    updateData.isActive = body.isActive
    updateData.closedAt = body.isActive ? null : new Date()
  }

  const updated = await prisma.assessment.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ assessment: updated })
}

/**
 * DELETE /api/admin/assessments/[id]
 * Delete assessment and all participant data.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const assessment = await prisma.assessment.findUnique({ where: { id } })
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (assessment.createdById !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.assessment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
