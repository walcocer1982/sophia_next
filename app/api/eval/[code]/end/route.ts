import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * POST /api/eval/[code]/end
 * Clears guest cookies so the kiosko can accept the next participant.
 */
export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('guest_user_id')
  cookieStore.delete('guest_participant_id')
  return NextResponse.json({ success: true })
}
