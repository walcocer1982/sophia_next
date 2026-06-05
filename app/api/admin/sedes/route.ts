import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * CRUD de Sedes (solo SUPERADMIN). Una Sede es un campus físico (ABQ, IRQ,
 * FCHB) o virtual (ENTER). El code es el identificador corto único — sirve
 * tanto para mostrar al usuario como para queries.
 */

function requireSuperadmin(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

// GET — listar todas las sedes con conteos
export async function GET() {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const sedes = await prisma.sede.findMany({
    orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      address: true,
      isVirtual: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { courses: true, sections: true, users: true },
      },
    },
  })

  return NextResponse.json({ sedes })
}

// POST — crear nueva sede
export async function POST(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const body = (await request.json()) as {
    code?: string
    name?: string
    city?: string
    address?: string
    isVirtual?: boolean
  }

  const code = body.code?.trim().toUpperCase() || ''
  const name = body.name?.trim() || ''

  if (code.length < 2 || code.length > 10) {
    return NextResponse.json({ error: 'El código debe tener entre 2 y 10 caracteres' }, { status: 400 })
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: 'El código solo puede contener letras, números, guiones y _' }, { status: 400 })
  }
  if (name.length < 3) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
  }

  // Chequear duplicado de code
  const existing = await prisma.sede.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: `Ya existe una sede con código "${code}"` }, { status: 409 })
  }

  const sede = await prisma.sede.create({
    data: {
      code,
      name,
      city: body.city?.trim() || null,
      address: body.address?.trim() || null,
      isVirtual: !!body.isVirtual,
    },
    select: {
      id: true, code: true, name: true, city: true, address: true,
      isVirtual: true, isActive: true, createdAt: true,
      _count: { select: { courses: true, sections: true, users: true } },
    },
  })

  return NextResponse.json({ sede }, { status: 201 })
}

// PUT — actualizar sede existente (renombrar, cambiar city, toggle isVirtual/isActive)
export async function PUT(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const body = (await request.json()) as {
    id?: string
    name?: string
    city?: string | null
    address?: string | null
    isVirtual?: boolean
    isActive?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  // No permitimos cambiar el code — es identificador estable. Para cambiar
  // code habría que crear nueva sede y migrar datos.
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (trimmed.length < 3) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
    }
    updateData.name = trimmed
  }
  if (body.city !== undefined) updateData.city = body.city?.trim() || null
  if (body.address !== undefined) updateData.address = body.address?.trim() || null
  if (body.isVirtual !== undefined) updateData.isVirtual = body.isVirtual
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  const sede = await prisma.sede.update({
    where: { id: body.id },
    data: updateData,
    select: {
      id: true, code: true, name: true, city: true, address: true,
      isVirtual: true, isActive: true, createdAt: true,
      _count: { select: { courses: true, sections: true, users: true } },
    },
  })

  return NextResponse.json({ sede })
}

// DELETE — borrar sede (solo si no tiene cursos/secciones/usuarios asignados)
export async function DELETE(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const { id } = (await request.json()) as { id?: string }
  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const sede = await prisma.sede.findUnique({
    where: { id },
    select: { _count: { select: { courses: true, sections: true, users: true } } },
  })

  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  const totalRefs = sede._count.courses + sede._count.sections + sede._count.users
  if (totalRefs > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: tiene ${sede._count.courses} cursos, ${sede._count.sections} secciones, ${sede._count.users} usuarios. Desactivá la sede en vez de borrarla.`,
      },
      { status: 409 }
    )
  }

  await prisma.sede.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
