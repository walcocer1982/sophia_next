import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET /api/user/enroll-section?careerId=xxx — List available sections for student's career
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const careerId = searchParams.get('careerId')

  if (!careerId) {
    return NextResponse.json({ error: 'careerId requerido' }, { status: 400 })
  }

  // Get active sections for courses in this career (include transversal courses)
  const sections = await prisma.section.findMany({
    where: {
      course: {
        OR: [{ careerId }, { careerId: null }],
        deletedAt: null,
      },
      period: { isActive: true },
    },
    orderBy: [{ period: { name: 'desc' } }, { course: { title: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      period: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  })

  // Check student's current enrollments
  const currentEnrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    select: {
      sectionId: true,
      section: {
        select: {
          courseId: true,
          period: { select: { name: true } },
        },
      },
    },
  })

  return NextResponse.json({
    sections,
    currentEnrollments: currentEnrollments.map(e => ({
      sectionId: e.sectionId,
      courseId: e.section.courseId,
      periodName: e.section.period.name,
    })),
  })
}

// POST /api/user/enroll-section — Student enrolls in a section
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sectionId } = (await request.json()) as { sectionId: string }

  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId requerido' }, { status: 400 })
  }

  // Verify section exists and is in an active period
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      period: { select: { isActive: true } },
      course: { select: { id: true, title: true, careerId: true } },
    },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (!section.period.isActive) {
    return NextResponse.json({ error: 'Este periodo no está activo' }, { status: 400 })
  }

  // Check if student is already enrolled in another section of the same course+period
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      section: {
        courseId: section.course.id,
        periodId: section.periodId,
      },
    },
    include: { section: { select: { name: true } } },
  })

  if (existingEnrollment) {
    return NextResponse.json(
      { error: `Ya estás matriculado en "${existingEnrollment.section.name}" para este curso` },
      { status: 409 }
    )
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: session.user.id,
      sectionId,
    },
    include: {
      section: {
        select: {
          name: true,
          course: { select: { title: true } },
          period: { select: { name: true } },
        },
      },
    },
  })

  return NextResponse.json({
    success: true,
    sectionName: enrollment.section.name,
    courseName: enrollment.section.course.title,
    periodName: enrollment.section.period.name,
  })
}
