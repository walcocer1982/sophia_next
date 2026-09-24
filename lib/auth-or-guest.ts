import { auth } from '@/auth'

/**
 * Usuario autenticado para los endpoints de chat, voz y encuesta.
 *
 * Hasta el 14 set 2026 acá se leía primero la cookie `guest_user_id` del
 * kiosko (/eval). El kiosko se retiró; queda solo la sesión de NextAuth. El
 * nombre y la forma del resultado se conservan para no tocar a los callers.
 */
export interface AuthOrGuestResult {
  userId: string
  isGuest: boolean
  role: string
}

export async function getAuthOrGuest(): Promise<AuthOrGuestResult | null> {
  const session = await auth()
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      isGuest: false,
      role: session.user.role || 'STUDENT',
    }
  }
  return null
}
