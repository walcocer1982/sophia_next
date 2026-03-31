import { auth } from '@/auth'
import { NextResponse } from 'next/server'

type RoleCheck = 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN'

// Role hierarchy: SUPERADMIN > ADMIN > INSTRUCTOR > STUDENT
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0,
  INSTRUCTOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
}

/**
 * Verify session has required minimum role. Returns session or error response.
 * Role hierarchy: SUPERADMIN > ADMIN > INSTRUCTOR > STUDENT
 */
export async function requireRole(minRole: RoleCheck) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = session.user.role || 'STUDENT'
  const userLevel = ROLE_LEVEL[userRole] || 0
  const requiredLevel = ROLE_LEVEL[minRole] || 0

  if (userLevel < requiredLevel) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}

/**
 * Check if session user is the resource owner or a SUPERADMIN.
 */
export function isOwnerOrSuperadmin(
  session: { user: { id: string; role?: string } },
  resourceUserId: string | null
): boolean {
  return session.user.role === 'SUPERADMIN' || resourceUserId === session.user.id
}
