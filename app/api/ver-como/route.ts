import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { COOKIE_VER_COMO, alcanceEfectivo } from '@/lib/ver-como'

export const runtime = 'nodejs'

/** Lista de personas a las que el superadmin puede prestarse los ojos. */
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const personas = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'INSTRUCTOR'] } },
    select: {
      id: true, name: true, email: true, role: true,
      sede: { select: { code: true } },
      career: { select: { code: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  const { viendoComo } = await alcanceEfectivo(session)
  return NextResponse.json({ personas, viendoComo })
}

/** `{ userId }` activa el modo; `{ userId: null }` vuelve a los ojos propios. */
export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { userId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true, viendoComo: body.userId ?? null })

  if (!body.userId) {
    res.cookies.delete(COOKIE_VER_COMO)
    return res
  }

  const otro = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, role: true },
  })
  if (!otro || otro.role === 'STUDENT') {
    return NextResponse.json({ error: 'Esa cuenta no es de staff' }, { status: 400 })
  }

  res.cookies.set(COOKIE_VER_COMO, otro.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // se cae sola al terminar la jornada
  })
  return res
}
