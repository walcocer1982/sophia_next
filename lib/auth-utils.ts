import { auth } from '@/auth'
import { NextResponse } from 'next/server'

type RoleCheck = 'ADMIN' | 'SUPERADMIN'

/**
 * Verify session has required role. Returns session or error response.
 * Usage: const result = await requireRole('ADMIN')
 *        if (result instanceof NextResponse) return result
 *        const session = result
 */
export async function requireRole(minRole: RoleCheck) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role || 'STUDENT'

  if (minRole === 'SUPERADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (minRole === 'ADMIN' && role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}
