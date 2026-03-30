import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export const runtime = 'nodejs'

// GET /api/admin/periods — List all academic periods
export async function GET() {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const periods = await prisma.academicPeriod.findMany({
    orderBy: { name: 'desc' },
    include: {
      _count: { select: { sections: true } },
    },
  })

  return NextResponse.json(periods)
}

// POST /api/admin/periods — Create a new academic period (SUPERADMIN only)
export async function POST(request: Request) {
  const result = await requireRole('SUPERADMIN')
  if (result instanceof NextResponse) return result

  const { name } = (await request.json()) as { name: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nombre del periodo requerido' }, { status: 400 })
  }

  const existing = await prisma.academicPeriod.findUnique({ where: { name: name.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Este periodo ya existe' }, { status: 409 })
  }

  const period = await prisma.academicPeriod.create({
    data: { name: name.trim() },
  })

  return NextResponse.json(period, { status: 201 })
}
