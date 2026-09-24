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
//
// Acepta ids de usuario o DNIs. Los DNIs son la llave del padrón: es lo que
// el líder tiene a mano cuando arma la lista de tutoría («estos veinte»), y
// hasta ahora no había forma de cargarla sin buscar alumno por alumno.
//
// Body: { userIds?: string[]; dnis?: string[] }
// → { enrolled, enrollments, noEncontrados: string[] }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { sectionId } = await params
  const body = (await request.json()) as { userIds?: string[]; dnis?: string[] }
  const userIds = Array.isArray(body.userIds) ? body.userIds : []
  // Solo dígitos, sin duplicados: el padrón guarda el DNI limpio.
  const dnis = [...new Set(
    (Array.isArray(body.dnis) ? body.dnis : [])
      .map((d) => String(d).replace(/\D/g, ''))
      .filter((d) => d.length >= 6)
  )]

  if (!userIds.length && !dnis.length) {
    return NextResponse.json({ error: 'userIds o dnis requeridos' }, { status: 400 })
  }

  // Verify section exists and user has access
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { userId: true } } },
  })

  if (!section) {
    return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
  }

  if (section.isArchived) {
    return NextResponse.json(
      { error: 'Sección archivada (read-only). Desarchivala para inscribir.' },
      { status: 409 }
    )
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

  // DNIs → usuarios del padrón. Los que no estén se devuelven para que el
  // líder vea cuáles faltan (tipeo, o alumno que no está en el padrón).
  const porDni = dnis.length
    ? await prisma.user.findMany({
        where: { dni: { in: dnis } },
        select: { id: true, dni: true },
      })
    : []
  const encontrados = new Set(porDni.map((u) => u.dni))
  const noEncontrados = dnis.filter((d) => !encontrados.has(d))
  const ids = [...new Set([...userIds, ...porDni.map((u) => u.id)])]

  if (ids.length === 0) {
    return NextResponse.json({ enrolled: 0, enrollments: [], noEncontrados })
  }

  // Bulk upsert enrollments
  const results = await Promise.all(
    ids.map(userId =>
      prisma.enrollment.upsert({
        where: { userId_sectionId: { userId, sectionId } },
        create: { userId, sectionId },
        update: {},
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    )
  )

  return NextResponse.json({ enrolled: results.length, enrollments: results, noEncontrados }, { status: 201 })
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

  if (section.isArchived) {
    return NextResponse.json(
      { error: 'Sección archivada (read-only). Desarchivala para modificar inscripciones.' },
      { status: 409 }
    )
  }

  if (!isOwnerOrSuperadmin(session, section.course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.enrollment.deleteMany({
    where: { userId, sectionId },
  })

  return NextResponse.json({ success: true })
}
