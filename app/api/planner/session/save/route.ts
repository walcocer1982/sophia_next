import { requireRole, isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { SessionSaveSchema } from '@/lib/planner/validation'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = SessionSaveSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { lessonId, keyPoints, contentJson } = parseResult.data

  // Verify lesson exists. Necesitamos careerId del curso para chequear
  // acceso de ADMIN-mismo-carrera (no solo dueño).
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      course: { select: { userId: true, careerId: true } },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Acceso permitido si: dueño del curso, superadmin, O admin de la misma
  // carrera (mismo criterio que /planner/[courseId]/page.tsx ya usa para
  // permitir editar — commit 8e91d8a).
  const isAllowed =
    isOwnerOrSuperadmin(session, lesson.course.userId) ||
    isAdminSameCareer(session, lesson.course.careerId)

  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        keyPoints,
        contentJson,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session save error:', error)
    return NextResponse.json(
      { error: 'Error al guardar la sesión' },
      { status: 500 }
    )
  }
}
