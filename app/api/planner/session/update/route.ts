import { requireRole, isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { SessionUpdateSchema } from '@/lib/planner/validation'
import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Actualización PARCIAL de una sesión ya diseñada (modo edición).
// Guarda directo a la DB el/los campos enviados, haciendo merge sobre
// contentJson para no pisar las subkeys no enviadas.
export async function PATCH(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = SessionUpdateSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { lessonId, tema, objetivo, instrucciones, keyPoints, contenidoTecnico, activities } =
    parseResult.data

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      contentJson: true,
      course: { select: { userId: true, careerId: true } },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const isAllowed =
    isOwnerOrSuperadmin(session, lesson.course.userId) ||
    isAdminSameCareer(session, lesson.course.careerId)

  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Construir el update solo con los campos enviados.
  const data: Prisma.LessonUpdateInput = {}

  // tema → title, objetivo → objective. NO se toca slug (es @unique y ancla
  // los links; se mantiene estable aunque cambie el título).
  if (tema !== undefined) data.title = tema
  if (objetivo !== undefined) data.objective = objetivo
  if (keyPoints !== undefined) data.keyPoints = keyPoints

  // Merge dentro de contentJson: leer actual → sobrescribir solo las subkeys
  // enviadas → escribir. Evita pisar activities/instrucciones/contenidoTecnico
  // que no vengan en este request.
  if (activities !== undefined || instrucciones !== undefined || contenidoTecnico !== undefined) {
    const current =
      lesson.contentJson && typeof lesson.contentJson === 'object' && !Array.isArray(lesson.contentJson)
        ? (lesson.contentJson as Record<string, unknown>)
        : {}

    const merged: Record<string, unknown> = { ...current }
    if (activities !== undefined) merged.activities = activities
    if (instrucciones !== undefined) merged.instrucciones = instrucciones
    if (contenidoTecnico !== undefined) merged.contenidoTecnico = contenidoTecnico

    data.contentJson = merged as Prisma.InputJsonValue
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    await prisma.lesson.update({ where: { id: lessonId }, data })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la sesión' },
      { status: 500 }
    )
  }
}
