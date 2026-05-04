import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

/**
 * Returns the current user from either:
 *  - NextAuth session (Google OAuth)
 *  - Guest cookie set during /eval/[code]/start
 *
 * Used by chat/voice endpoints so the same flow works for authenticated
 * students and anonymous assessment participants.
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

  const cookieStore = await cookies()
  const guestUserId = cookieStore.get('guest_user_id')?.value
  if (!guestUserId) return null

  // Verify the guest user actually exists
  const user = await prisma.user.findUnique({
    where: { id: guestUserId },
    select: { id: true, role: true },
  })
  if (!user) return null

  return {
    userId: user.id,
    isGuest: true,
    role: user.role,
  }
}
