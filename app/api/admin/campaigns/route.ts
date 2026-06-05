import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * CRUD de EventCampaigns (solo SUPERADMIN).
 * Una EventCampaign agrupa kioskos (assessments) que pertenecen al mismo
 * evento real: feria, conferencia, congreso. Ej: "27th World Mining
 * Congress 2026", "ProExplo Feria Junio".
 */

function requireSuperadmin(session: { user?: { role?: string } } | null) {
  if (!session?.user?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

const CAMPAIGN_SELECT = {
  id: true,
  name: true,
  shortName: true,
  startDate: true,
  endDate: true,
  location: true,
  url: true,
  isArchived: true,
  createdAt: true,
  _count: { select: { assessments: true } },
} as const

// GET — listar todas las campaigns con conteo de assessments
export async function GET() {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const campaigns = await prisma.eventCampaign.findMany({
    orderBy: [{ isArchived: 'asc' }, { startDate: 'desc' }],
    select: CAMPAIGN_SELECT,
  })

  return NextResponse.json({ campaigns })
}

// POST — crear nueva campaign
export async function POST(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const body = (await request.json()) as {
    name?: string
    shortName?: string
    startDate?: string
    endDate?: string
    location?: string
    url?: string
  }

  const name = body.name?.trim() || ''
  const startDate = body.startDate ? new Date(body.startDate) : null
  const endDate = body.endDate ? new Date(body.endDate) : null

  if (name.length < 3) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
  }
  if (!startDate || isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 })
  }
  if (!endDate || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Fecha de fin inválida' }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la de inicio' }, { status: 400 })
  }

  // URL validation (si la pasaron)
  const url = body.url?.trim() || null
  if (url) {
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }
  }

  const campaign = await prisma.eventCampaign.create({
    data: {
      name,
      shortName: body.shortName?.trim() || null,
      startDate,
      endDate,
      location: body.location?.trim() || null,
      url,
    },
    select: CAMPAIGN_SELECT,
  })

  return NextResponse.json({ campaign }, { status: 201 })
}

// PUT — actualizar campaign existente
export async function PUT(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const body = (await request.json()) as {
    id?: string
    name?: string
    shortName?: string | null
    startDate?: string
    endDate?: string
    location?: string | null
    url?: string | null
    isArchived?: boolean
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (trimmed.length < 3) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
    }
    updateData.name = trimmed
  }
  if (body.shortName !== undefined) updateData.shortName = body.shortName?.trim() || null
  if (body.location !== undefined) updateData.location = body.location?.trim() || null
  if (body.url !== undefined) {
    const url = body.url?.trim() || null
    if (url) {
      try { new URL(url) } catch {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
      }
    }
    updateData.url = url
  }
  if (body.startDate !== undefined) {
    const d = new Date(body.startDate)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 })
    }
    updateData.startDate = d
  }
  if (body.endDate !== undefined) {
    const d = new Date(body.endDate)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Fecha de fin inválida' }, { status: 400 })
    }
    updateData.endDate = d
  }
  if (body.isArchived !== undefined) updateData.isArchived = body.isArchived

  const campaign = await prisma.eventCampaign.update({
    where: { id: body.id },
    data: updateData,
    select: CAMPAIGN_SELECT,
  })

  return NextResponse.json({ campaign })
}

// DELETE — solo si no tiene assessments asignados
export async function DELETE(request: Request) {
  const session = await auth()
  const authErr = requireSuperadmin(session)
  if (authErr) return authErr

  const { id } = (await request.json()) as { id?: string }
  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const campaign = await prisma.eventCampaign.findUnique({
    where: { id },
    select: { _count: { select: { assessments: true } } },
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign no encontrada' }, { status: 404 })
  }

  if (campaign._count.assessments > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: tiene ${campaign._count.assessments} kioskos asignados. Archivá la campaña en vez de borrarla.`,
      },
      { status: 409 }
    )
  }

  await prisma.eventCampaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
