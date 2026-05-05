import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const VALID_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'] as const

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, newRole } = (await request.json()) as {
    userId?: string
    newRole?: string
  }

  if (!userId || !newRole) {
    return NextResponse.json({ error: 'userId and newRole are required' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(newRole as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Prevent removing own SUPERADMIN role
  if (userId === session.user.id && newRole !== 'SUPERADMIN') {
    return NextResponse.json(
      { error: 'No puedes quitarte el rol de SUPERADMIN' },
      { status: 400 }
    )
  }

  // Block role changes on guest/anonymous kiosko users — they exist only as
  // shells for AssessmentParticipant rows and must stay STUDENT.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (target?.email?.endsWith('@assessment.local')) {
    return NextResponse.json(
      {
        error:
          'No se puede cambiar el rol de un participante anónimo de evaluación.',
      },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as typeof VALID_ROLES[number] },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ success: true, user })
}
