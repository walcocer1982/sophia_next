import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { seccionesVisibles } from '@/lib/alcance'
import { alcanceEfectivo } from '@/lib/ver-como'
import { cargarReporteDeClase } from '@/lib/reporte-clase-datos'
import { redactarRefuerzo } from '@/lib/reporte-clase-ia'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * La parte redactada del reporte de la sesión por sección (22 oct 2026): el
 * modelo escribe cómo abordar los criterios que el código eligió reforzar.
 *
 *   POST { lessonId, sectionId, fresco? } → { texto, generadoEn, desdeCache }
 */
export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = session.user.role
  if (rol !== 'ADMIN' && rol !== 'SUPERADMIN' && rol !== 'INSTRUCTOR') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { courseId } = await params
  const { lessonId, sectionId, fresco } = (await request.json().catch(() => ({}))) as { lessonId?: string; sectionId?: string; fresco?: boolean }
  if (!lessonId || !sectionId) return NextResponse.json({ error: 'Faltan lessonId y sectionId' }, { status: 400 })

  const { alcance } = await alcanceEfectivo(session)
  const filtro = alcance.role === 'SUPERADMIN' ? {} : seccionesVisibles(alcance)
  const datos = await cargarReporteDeClase({ courseId, lessonId, sectionId, filtro })
  if (!datos) return NextResponse.json({ error: 'Sección o sesión fuera de tu alcance' }, { status: 404 })

  try {
    const r = await redactarRefuerzo({
      sesion: `S${datos.leccion.order} · ${datos.leccion.title}`,
      actividades: datos.leccion.actividades,
      clase: datos.clase,
      fresco: fresco === true,
    })
    return NextResponse.json(r)
  } catch (e) {
    logger.error('reporte_clase.redaccion_fallo', { courseId, lessonId, sectionId, error: String(e) })
    return NextResponse.json({ error: 'No se pudo redactar; los datos de arriba siguen siendo válidos.' }, { status: 502 })
  }
}
