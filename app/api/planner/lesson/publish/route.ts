import { requireRole, isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { lessonId, publish, availableAt, closesAfterHours, sectionId } = (await request.json()) as {
    lessonId: string
    publish: boolean
    availableAt?: string | null
    closesAfterHours?: number
    sectionId?: string
  }

  if (!lessonId || typeof publish !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      courseId: true,
      course: { select: { userId: true, careerId: true } },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // === SECTION-SPECIFIC PUBLISH ===
  if (sectionId) {
    // Verify user is lead/superadmin, career-match admin, or section instructor
    const isLead = isOwnerOrSuperadmin(session, lesson.course.userId)
    const isCareerAdmin = isAdminSameCareer(session, lesson.course.careerId)
    if (!isLead && !isCareerAdmin) {
      const isSectionInstructor = await prisma.sectionInstructor.findUnique({
        where: { userId_sectionId: { userId: session.user.id, sectionId } },
      })
      if (!isSectionInstructor) {
        return NextResponse.json({ error: 'No autorizado para esta sección' }, { status: 403 })
      }
    }

    if (publish) {
      const schedule = await prisma.sectionLessonSchedule.upsert({
        where: { sectionId_lessonId: { sectionId, lessonId } },
        create: {
          sectionId,
          lessonId,
          availableAt: availableAt ? new Date(availableAt) : new Date(),
          closesAfterHours: closesAfterHours || 3,
        },
        update: {
          availableAt: availableAt ? new Date(availableAt) : new Date(),
          closesAfterHours: closesAfterHours || 3,
        },
      })

      // Also ensure lesson is marked as published (content level)
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { isPublished: true },
      })

      return NextResponse.json({
        success: true,
        isPublished: true,
        availableAt: schedule.availableAt,
        closesAfterHours: schedule.closesAfterHours,
        sectionId,
      })
    } else {
      // Unpublish for this section
      await prisma.sectionLessonSchedule.deleteMany({
        where: { sectionId, lessonId },
      })

      return NextResponse.json({
        success: true,
        isPublished: false,
        availableAt: null,
        sectionId,
      })
    }
  }

  // === GLOBAL PUBLISH (lead instructor / superadmin) ===
  if (!isOwnerOrSuperadmin(session, lesson.course.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updateData: { isPublished: boolean; availableAt?: Date | null; closesAfterHours?: number } = {
    isPublished: publish,
  }

  if (publish) {
    updateData.availableAt = availableAt ? new Date(availableAt) : new Date()
    if (closesAfterHours && closesAfterHours > 0) {
      updateData.closesAfterHours = closesAfterHours
    }
  } else {
    updateData.availableAt = null
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: updateData,
    select: { isPublished: true, availableAt: true, closesAfterHours: true },
  })

  return NextResponse.json({
    success: true,
    isPublished: updated.isPublished,
    availableAt: updated.availableAt,
    closesAfterHours: updated.closesAfterHours,
  })
}
