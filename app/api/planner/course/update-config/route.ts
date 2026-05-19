import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * POST /api/planner/course/update-config
 *
 * Consolidated per-course configuration: methodology + behavior switches
 * (voice, paste, image paste). Accepts a partial payload — only the provided
 * fields are updated. Only the course owner or a SUPERADMIN may change it.
 * (Replaced the older standalone /update-voice endpoint.)
 */
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const body = (await request.json()) as {
    courseId?: string
    methodology?: 'REFLECTIVE' | 'CODE'
    voiceEnabled?: boolean
    allowPaste?: boolean
    allowImagePaste?: boolean
  }

  if (!body.courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
  }

  const data: Prisma.CourseUpdateInput = {}
  if (body.methodology !== undefined) {
    if (body.methodology !== 'REFLECTIVE' && body.methodology !== 'CODE') {
      return NextResponse.json({ error: 'methodology inválida' }, { status: 400 })
    }
    data.methodology = body.methodology
  }
  if (typeof body.voiceEnabled === 'boolean') data.voiceEnabled = body.voiceEnabled
  if (typeof body.allowPaste === 'boolean') data.allowPaste = body.allowPaste
  if (typeof body.allowImagePaste === 'boolean') data.allowImagePaste = body.allowImagePaste

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const course = await prisma.course.findFirst({
    where: { id: body.courseId, deletedAt: null },
    select: { userId: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }
  if (course.userId !== session.user.id && session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const updated = await prisma.course.update({
    where: { id: body.courseId },
    data,
    select: {
      id: true,
      methodology: true,
      voiceEnabled: true,
      allowPaste: true,
      allowImagePaste: true,
    },
  })

  return NextResponse.json({ success: true, course: updated })
}
