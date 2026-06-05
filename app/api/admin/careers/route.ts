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
    orderBy: [{ code: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      createdAt: true,
      sedes: { select: { id: true, code: true, name: true } },
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

  const body = (await request.json()) as {
    name?: string
    code?: string | null
    sedeIds?: string[]
  }

  const name = body.name?.trim() ?? ''
  if (name.length < 3) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
  }

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const code = body.code?.trim().toUpperCase() || null

  // Check duplicate por name o slug o code
  const existing = await prisma.career.findFirst({
    where: {
      OR: [
        { name },
        { slug },
        ...(code ? [{ code }] : []),
      ],
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'Ya existe una carrera con ese nombre o c\u00f3digo' }, { status: 409 })
  }

  const career = await prisma.career.create({
    data: {
      name,
      slug,
      code,
      sedes: body.sedeIds && body.sedeIds.length > 0
        ? { connect: body.sedeIds.map((id) => ({ id })) }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      createdAt: true,
      sedes: { select: { id: true, code: true, name: true } },
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

  const body = (await request.json()) as {
    id?: string
    name?: string
    code?: string | null
    sedeIds?: string[]
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const data: {
    name?: string
    slug?: string
    code?: string | null
    sedes?: { set: { id: string }[] }
  } = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (name.length < 3) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
    }
    data.name = name
    data.slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  if (body.code !== undefined) {
    data.code = body.code?.trim().toUpperCase() || null
  }

  if (Array.isArray(body.sedeIds)) {
    data.sedes = { set: body.sedeIds.map((id) => ({ id })) }
  }

  const career = await prisma.career.update({
    where: { id: body.id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      createdAt: true,
      sedes: { select: { id: true, code: true, name: true } },
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
