import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

/**
 * DEV ONLY · POST /api/dev/img-anchor-log
 *
 * Endpoint efímero para diagnosticar el problema de "Sophia no muestra la
 * imagen correcta" en el kiosko EPPs. El frontend (assessment-session.tsx)
 * postea cada decisión del effect que ancla imágenes a mensajes, y este
 * endpoint las anexa a logs/img-anchor.log para que el dev pueda hacer
 * `tail -f` sin tener que pedir capturas al usuario.
 *
 * Borrar este endpoint y el helper de logs cuando se resuelva el bug.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'dev only' }, { status: 403 })
  }
  try {
    const { entry } = (await request.json()) as { entry?: string }
    if (!entry || typeof entry !== 'string') {
      return NextResponse.json({ error: 'entry required' }, { status: 400 })
    }
    const logDir = path.resolve(process.cwd(), 'logs')
    await fs.mkdir(logDir, { recursive: true })
    const line = `${new Date().toISOString()} ${entry}\n`
    await fs.appendFile(path.join(logDir, 'img-anchor.log'), line, 'utf8')
    return new Response(null, { status: 204 })
  } catch (e) {
    console.error('img-anchor-log error:', e)
    return NextResponse.json({ error: 'log failed' }, { status: 500 })
  }
}
