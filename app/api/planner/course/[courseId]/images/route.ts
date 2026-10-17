import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { cursoEditable } from '@/lib/planner/course-access'
import { IMAGE_KINDS, adoptarImagenesDelCurso, usosPorImagen } from '@/lib/course-images'

export const runtime = 'nodejs'

/**
 * Banco de imágenes del curso.
 * GET  → lista con usos en las lecciones.
 * POST → registra una imagen ya subida a Cloudinary, o adopta las de las lecciones ({ adopt: true }).
 * Spec: investigacion/panel-de-apoyo-especificacion.md §9.3
 */

const CrearSchema = z.object({
  url: z.string().url(),
  description: z.string().max(2000).default(''),
  kind: z.enum(IMAGE_KINDS).default('equipment'),
  source: z.string().max(160).default(''),
  license: z.string().max(160).default(''),
  tags: z.array(z.string().max(60)).max(10).default([]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireRole('INSTRUCTOR')
  if (session instanceof NextResponse) return session
  const { courseId } = await params
  if (!(await cursoEditable(session, courseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [imagenes, lecciones] = await Promise.all([
    prisma.courseImage.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' } }),
    prisma.lesson.findMany({ where: { courseId }, select: { id: true, title: true, contentJson: true } }),
  ])
  const usos = usosPorImagen(imagenes, lecciones)
  return NextResponse.json({ images: imagenes.map((i) => ({ ...i, usos: usos.get(i.id) ?? [] })) })
}

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireRole('INSTRUCTOR')
  if (session instanceof NextResponse) return session
  const { courseId } = await params
  if (!(await cursoEditable(session, courseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if ((body as { adopt?: boolean })?.adopt === true) {
    const adoptadas = await adoptarImagenesDelCurso(courseId, session.user.id)
    return NextResponse.json({ adopted: adoptadas })
  }

  const parsed = CrearSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  // Una foto ya registrada en el curso no se duplica: se devuelve la existente.
  const existente = await prisma.courseImage.findFirst({ where: { courseId, url: parsed.data.url } })
  if (existente) return NextResponse.json({ image: existente, existed: true })

  const image = await prisma.courseImage.create({
    data: { ...parsed.data, courseId, uploadedBy: session.user.id, validated: false },
  })
  return NextResponse.json({ image }, { status: 201 })
}
