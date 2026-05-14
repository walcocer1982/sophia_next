import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/eval/[code]
 * Public endpoint - returns assessment metadata for the kiosko mode.
 * No auth required (anonymous access).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      title: true,
      isActive: true,
      timeLimitMin: true,
      collectEmail: true,
      collectDni: true,
      lesson: { select: { title: true } },
    },
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })
  }

  if (!assessment.isActive) {
    return NextResponse.json({ error: 'Esta evaluación está cerrada' }, { status: 403 })
  }

  return NextResponse.json({ assessment })
}
