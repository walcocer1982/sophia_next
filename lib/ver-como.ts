import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { Alcance } from '@/lib/alcance'

export const COOKIE_VER_COMO = 'ver-como'

/**
 * «Ver como»: el superadmin mira la aplicación con el alcance de otra persona.
 *
 * No es suplantación ni escalada: el superadmin ya ve todo, así que elegir a
 * alguien solo RECORTA. Sirve para reproducir el problema donde ocurre —«Ana no
 * ve su curso»— sin pedirle la contraseña a nadie.
 *
 * Es solo lectura. El bloqueo de escrituras vive en `proxy.ts`, que es el único
 * lugar que ve el método HTTP de todas las rutas a la vez.
 */

export type SesionMinima = {
  user: { id: string; role?: string; careerId?: string | null; sedeId?: string | null }
} | null

export type AlcanceEfectivo = {
  alcance: Alcance
  /** Nombre de la persona observada, o null si estás mirando con tus propios ojos. */
  viendoComo: string | null
}

export async function alcanceEfectivo(session: SesionMinima): Promise<AlcanceEfectivo> {
  const propio: Alcance = session
    ? {
        id: session.user.id,
        role: session.user.role,
        careerId: session.user.careerId,
        sedeId: session.user.sedeId,
      }
    : { id: '', role: null }

  // Solo el superadmin puede prestarse otros ojos.
  if (!session || session.user.role !== 'SUPERADMIN') return { alcance: propio, viendoComo: null }

  const id = (await cookies()).get(COOKIE_VER_COMO)?.value
  if (!id) return { alcance: propio, viendoComo: null }

  const otro = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, careerId: true, sedeId: true },
  })
  // Si la cuenta ya no existe o dejó de ser staff, se vuelve a los ojos propios
  // en silencio en vez de mostrar una pantalla vacía sin explicación.
  if (!otro || otro.role === 'STUDENT') return { alcance: propio, viendoComo: null }

  return {
    alcance: { id: otro.id, role: otro.role, careerId: otro.careerId, sedeId: otro.sedeId },
    viendoComo: otro.name ?? otro.email,
  }
}
