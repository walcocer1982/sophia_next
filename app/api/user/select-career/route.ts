import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/user/select-career — List available careers
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return NextResponse.json({ careers })
}

/**
 * POST /api/user/select-career — Student selects their career
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { careerId } = (await request.json()) as { careerId?: string }

  if (!careerId) {
    return NextResponse.json({ error: 'careerId is required' }, { status: 400 })
  }

  const career = await prisma.career.findUnique({ where: { id: careerId } })
  if (!career) {
    return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { careerId },
  })

  return NextResponse.json({ success: true, careerName: career.name })
}
