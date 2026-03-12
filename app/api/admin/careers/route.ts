import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/admin/careers — List all careers
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { users: true, courses: true } },
    },
  })

  return NextResponse.json({ careers })
}

/**
 * POST /api/admin/careers — Create a new career
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = (await request.json()) as { name?: string }

  if (!name || name.trim().length < 3) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const slug = trimmedName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check if career already exists
  const existing = await prisma.career.findFirst({
    where: { OR: [{ name: trimmedName }, { slug }] },
  })

  if (existing) {
    return NextResponse.json({ error: 'Ya existe una carrera con ese nombre' }, { status: 409 })
  }

  const career = await prisma.career.create({
    data: { name: trimmedName, slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { users: true, courses: true } },
    },
  })

  return NextResponse.json({ career }, { status: 201 })
}

/**
 * PUT /api/admin/careers — Rename a career
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, name } = (await request.json()) as { id?: string; name?: string }

  if (!id || !name || name.trim().length < 3) {
    return NextResponse.json({ error: 'id y nombre (min 3 caracteres) son requeridos' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const slug = trimmedName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const career = await prisma.career.update({
    where: { id },
    data: { name: trimmedName, slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { users: true, courses: true } },
    },
  })

  return NextResponse.json({ career })
}

/**
 * DELETE /api/admin/careers — Delete a career (only if no users/courses)
 */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = (await request.json()) as { id?: string }

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Check if career has users or courses
  const career = await prisma.career.findUnique({
    where: { id },
    select: { _count: { select: { users: true, courses: true } } },
  })

  if (!career) {
    return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })
  }

  if (career._count.users > 0 || career._count.courses > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${career._count.users} usuarios y ${career._count.courses} cursos asignados` },
      { status: 409 }
    )
  }

  await prisma.career.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
