import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'
import { esAdminDelCurso } from '@/lib/alcance'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/** «S0 — Construye tu plan» → «s0-construye-tu-plan» */
function slugify(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * POST /api/planner/lesson/create
 *
 * Agrega una sesión a un curso ya creado.
 *
 * Hasta ahora las sesiones solo nacían al crear el curso, a partir de la lista
 * de temas: si después hacía falta una más, no había forma de agregarla.
 *
 * Body: { courseId, title, objective? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole('ADMIN')
    if (session instanceof NextResponse) return session

    const { courseId, title, objective } = (await request.json()) as {
      courseId?: string; title?: string; objective?: string
    }
    if (!courseId || !title?.trim()) {
      return NextResponse.json({ error: 'courseId y title son requeridos' }, { status: 400 })
    }

    const curso = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        id: true, slug: true, userId: true, scope: true, careers: { select: { id: true } }, sedes: { select: { id: true } },
        lessons: { orderBy: { order: 'desc' }, take: 1, select: { order: true } },
      },
    })
    if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

    const puede =
      isOwnerOrSuperadmin(session, curso.userId) || esAdminDelCurso(session, curso)
    if (!puede) {
      return NextResponse.json({ error: 'No autorizado para este curso' }, { status: 403 })
    }

    const limpio = title.trim()
    const siguiente = (curso.lessons[0]?.order ?? 0) + 1

    // El slug es @unique en toda la base: si ya existe, se desambigua.
    const base = `${curso.slug}-${slugify(limpio)}`
    let slug = base
    for (let i = 2; await prisma.lesson.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`
    }

    const leccion = await prisma.lesson.create({
      data: {
        courseId: curso.id,
        title: limpio,
        slug,
        objective: objective?.trim() || '',
        keyPoints: [],
        order: siguiente,
        isPublished: false,
        // Nace vacía: el diseño de las actividades se hace después.
        contentJson: { activities: [] },
      },
      select: { id: true, title: true, order: true },
    })

    logger.info('planner.lesson.created', { courseId, lessonId: leccion.id, order: leccion.order })
    return NextResponse.json({ lesson: leccion })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error inesperado'
    logger.error('planner.lesson.create.error', { error: msg })
    return NextResponse.json({ error: msg.split(/\r?\n/)[0] }, { status: 500 })
  }
}
