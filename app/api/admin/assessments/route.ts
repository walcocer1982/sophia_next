import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { generateAssessmentCode } from '@/lib/assessment-utils'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/assessments
 * Create a new assessment (event/kiosko mode) for a lesson.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { lessonId, title, timeLimitMin, collectEmail, collectDni, expiresInDays } = await request.json()

  if (!lessonId || !title) {
    return NextResponse.json({ error: 'lessonId y title requeridos' }, { status: 400 })
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { userId: true, careerId: true, title: true } } },
  })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Check permissions: owner, superadmin or career admin
  const canCreate =
    isOwnerOrSuperadmin(session, lesson.course.userId) ||
    isAdminSameCareer(session, lesson.course.careerId)
  if (!canCreate) {
    return NextResponse.json({ error: 'No autorizado para esta lección' }, { status: 403 })
  }

  // Generate unique code (retry up to 5 times if collision)
  let code = generateAssessmentCode()
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.assessment.findUnique({ where: { code } })
    if (!existing) break
    code = generateAssessmentCode()
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days

  const assessment = await prisma.assessment.create({
    data: {
      code,
      title,
      lessonId,
      createdById: session.user.id,
      timeLimitMin: timeLimitMin || 10,
      collectEmail: !!collectEmail,
      collectDni: collectDni !== false, // Default true
      expiresAt,
    },
  })

  return NextResponse.json({
    id: assessment.id,
    code: assessment.code,
    publicUrl: `/eval/${assessment.code}`,
  })
}

/**
 * GET /api/admin/assessments?lessonId=xxx
 * List assessments for a lesson.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')

  const assessments = await prisma.assessment.findMany({
    where: lessonId ? { lessonId } : { createdById: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { participants: true } },
      lesson: { select: { title: true } },
    },
  })

  return NextResponse.json({ assessments })
}
