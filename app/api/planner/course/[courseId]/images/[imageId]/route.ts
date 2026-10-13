import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { cursoEditable } from '@/lib/planner/course-access'
import { IMAGE_KINDS, faltaParaValidar, propagarALecciones, usosPorImagen } from '@/lib/course-images'

export const runtime = 'nodejs'

/**
 * Una imagen del banco.
 * PATCH  → edita datos o la valida. Los cambios se copian a los bloques que la usan.
 * DELETE → solo si ninguna lección la usa.
 */

const EditarSchema = z.object({
  description: z.string().max(2000).optional(),
  kind: z.enum(IMAGE_KINDS).optional(),
  source: z.string().max(160).optional(),
  license: z.string().max(160).optional(),
  tags: z.array(z.string().max(60)).max(10).optional(),
  validated: z.boolean().optional(),
})

type Params = { params: Promise<{ courseId: string; imageId: string }> }

async function cargar(courseId: string, imageId: string) {
  return prisma.courseImage.findFirst({ where: { id: imageId, courseId } })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireRole('INSTRUCTOR')
  if (session instanceof NextResponse) return session
  const { courseId, imageId } = await params
  if (!(await cursoEditable(session, courseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const actual = await cargar(courseId, imageId)
  if (!actual) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = EditarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { validated, ...datos } = parsed.data
  const resultante = { ...actual, ...datos }
  const validacion: { validated?: boolean; validatedBy?: string | null; validatedAt?: Date | null } = {}
  let aviso: string | null = null

  if (validated === true && !actual.validated) {
    const faltas = faltaParaValidar(resultante, true)
    if (faltas.length) {
      return NextResponse.json({ error: `Para validarla falta ${faltas.join('; ')}.` }, { status: 400 })
    }
    validacion.validated = true
    validacion.validatedBy = session.user.id
    validacion.validatedAt = new Date()
    // Regla de Orion: valida alguien distinto de quien subió, cuando se pueda.
    if (actual.uploadedBy && actual.uploadedBy === session.user.id) {
      aviso = 'La validaste tú, que también la subiste. Si puedes, pide que la revise otra persona del área técnica.'
    }
  } else if (validated === false && actual.validated) {
    validacion.validated = false
    validacion.validatedBy = null
    validacion.validatedAt = null
  } else if (actual.validated && faltaParaValidar(resultante).length) {
    // Editar una validada no puede dejarla sin fuente o licencia y seguir validada.
    return NextResponse.json({ error: `Una imagen validada necesita ${faltaParaValidar(resultante).join('; ')}.` }, { status: 400 })
  }

  const image = await prisma.courseImage.update({ where: { id: imageId }, data: { ...datos, ...validacion } })
  const leccionesActualizadas = await propagarALecciones(image)
  return NextResponse.json({ image, leccionesActualizadas, aviso })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireRole('INSTRUCTOR')
  if (session instanceof NextResponse) return session
  const { courseId, imageId } = await params
  if (!(await cursoEditable(session, courseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const actual = await cargar(courseId, imageId)
  if (!actual) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lecciones = await prisma.lesson.findMany({ where: { courseId }, select: { id: true, title: true, contentJson: true } })
  const usos = usosPorImagen([actual], lecciones).get(actual.id) ?? []
  if (usos.length) {
    return NextResponse.json(
      { error: `La usan ${usos.length} lección(es): ${usos.map((u) => u.title).join(', ')}. Quítala de ahí primero.` },
      { status: 409 },
    )
  }
  await prisma.courseImage.delete({ where: { id: imageId } })
  return NextResponse.json({ success: true })
}
