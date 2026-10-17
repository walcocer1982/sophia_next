import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { historialDeSeguimiento, ORDEN_ESTADOS, ORDEN_MOTIVOS } from '@/lib/seguimiento'
import type { SeguimientoEstado, SeguimientoMotivo } from '@prisma/client'

export const runtime = 'nodejs'

const NOTA_MAX = 500

/**
 * Seguimiento manual del alumno (lib/seguimiento.ts).
 *
 * Quien marca tiene que poder ver al alumno: alguna sección suya dentro del
 * alcance de quien llama (`lib/alcance.ts`). La autoría es siempre la cuenta
 * real, aunque el superadmin esté «viendo como» otra persona.
 */
async function alAlcance(
  session: { user: { id: string; role?: string; careerId?: string | null; sedeId?: string | null } },
  userId: string
): Promise<boolean> {
  const { alcance } = await alcanceEfectivo(session)
  if (alcance.role === 'SUPERADMIN') return true
  const n = await prisma.enrollment.count({
    where: { userId, section: { AND: [{ isArchived: false }, seccionesVisibles(alcance)] } },
  })
  return n > 0
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const result = await requireRole('INSTRUCTOR')
  if (result instanceof NextResponse) return result
  const { userId } = await params
  if (!(await alAlcance(result, userId))) {
    return NextResponse.json({ error: 'Este estudiante no está a tu alcance' }, { status: 403 })
  }
  return NextResponse.json({ historial: await historialDeSeguimiento(userId) })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const result = await requireRole('INSTRUCTOR')
  if (result instanceof NextResponse) return result
  const { userId } = await params

  let body: { estado?: string; motivo?: string | null; courseId?: string | null; nota?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const estado = body.estado as SeguimientoEstado
  if (!ORDEN_ESTADOS.includes(estado)) {
    return NextResponse.json({ error: 'Estado desconocido' }, { status: 400 })
  }
  let motivo: SeguimientoMotivo | null = null
  if (estado === 'JUSTIFICADO') {
    if (!ORDEN_MOTIVOS.includes(body.motivo as SeguimientoMotivo)) {
      return NextResponse.json({ error: '«Justificado» necesita un motivo' }, { status: 400 })
    }
    motivo = body.motivo as SeguimientoMotivo
  }
  const nota = (body.nota ?? '').trim().slice(0, NOTA_MAX) || null
  const courseId = estado === 'JUSTIFICADO' && body.courseId ? body.courseId : null

  const alumno = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!alumno || alumno.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Esa cuenta no es de un estudiante' }, { status: 404 })
  }
  if (!(await alAlcance(result, userId))) {
    return NextResponse.json({ error: 'Este estudiante no está a tu alcance' }, { status: 403 })
  }
  if (courseId) {
    const curso = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true } })
    if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  const marca = await prisma.seguimientoAlumno.create({
    data: { userId, estado, motivo, courseId, nota, autorId: result.user.id },
    select: { id: true, estado: true, motivo: true, courseId: true, nota: true, createdAt: true },
  })
  return NextResponse.json({ marca })
}
