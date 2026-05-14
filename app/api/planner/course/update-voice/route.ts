import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/planner/course/update-voice
 * Toggles whether voice features (VoiceButton, TTS welcome, autoStart in
 * kiosko) are enabled for a course. Only the course owner or a SUPERADMIN
 * can change this.
 */
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId, voiceEnabled } = (await request.json()) as {
    courseId?: string
    voiceEnabled?: boolean
  }

  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
  }
  if (typeof voiceEnabled !== 'boolean') {
    return NextResponse.json({ error: 'voiceEnabled debe ser boolean' }, { status: 400 })
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { userId: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }
  if (course.userId !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { voiceEnabled },
    select: { id: true, voiceEnabled: true },
  })

  return NextResponse.json({ success: true, course: updated })
}
