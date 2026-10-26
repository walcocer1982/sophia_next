import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { esDni, nombresCoinciden } from '@/lib/cuenta-duplicada'
import { unirCuentas } from '@/lib/unir-cuentas'

export const runtime = 'nodejs'

// Intentos por cuenta: el DNI no es secreto, así que además del nombre se
// limita cuántos se prueban. En memoria por instancia: es un freno, no un registro.
const intentos = new Map<string, { n: number; desde: number }>()
const MAX_INTENTOS = 5
const VENTANA_MS = 10 * 60_000

/**
 * POST /api/user/vincular — El alumno que entró con un correo que no está en el
 * padrón escribe su DNI y su cuenta se une a la del padrón (26 oct 2026, ver
 * lib/cuenta-duplicada.ts). Exige que el nombre de Google y el del padrón
 * compartan al menos dos palabras; si no, lo une el tutor a mano
 * (scripts/unir-cuentas.ts).
 */
export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const userId = session.user.id
  const ahora = Date.now()
  const previo = intentos.get(userId)
  const cuenta = previo && ahora - previo.desde < VENTANA_MS ? previo : { n: 0, desde: ahora }
  if (cuenta.n >= MAX_INTENTOS) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos o pide ayuda a tu tutor.' }, { status: 429 })
  }
  intentos.set(userId, { ...cuenta, n: cuenta.n + 1 })

  const { dni } = (await request.json().catch(() => ({}))) as { dni?: string }
  if (!dni || !esDni(dni)) {
    return NextResponse.json({ error: 'El DNI tiene 8 dígitos.' }, { status: 400 })
  }

  const yo = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, dni: true, role: true, unidaA: true },
  })
  if (!yo || yo.role !== 'STUDENT' || yo.dni || yo.unidaA) {
    return NextResponse.json({ error: 'Tu cuenta ya está registrada.' }, { status: 400 })
  }

  const padron = await prisma.user.findUnique({
    where: { dni: dni.trim() },
    select: { id: true, name: true, role: true, unidaA: true },
  })
  if (!padron || padron.role !== 'STUDENT' || padron.unidaA) {
    return NextResponse.json(
      { error: 'No encontramos ese DNI en el padrón. Puedes seguir y elegir tu carrera.', noEncontrado: true },
      { status: 404 }
    )
  }
  if (!nombresCoinciden(yo.name, padron.name)) {
    logger.warn('user.vincular.nombre_distinto', { userId, padronId: padron.id })
    return NextResponse.json(
      { error: 'Ese DNI no coincide con el nombre de tu cuenta de Google. Pide a tu tutor que una tus cuentas.' },
      { status: 409 }
    )
  }

  const resultado = await unirCuentas(yo.id, padron.id)
  logger.info('user.vincular.unida', { duplicadaId: yo.id, padronId: padron.id, ...resultado })
  intentos.delete(userId)
  return NextResponse.json({ ok: true })
}
