import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'
import { esAdminDelCurso } from '@/lib/alcance'
import { callAndParseJson, DEFAULT_MODEL } from '@/lib/anthropic'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/planner/lesson/propose
 *
 * La IA mira el plan que ya existe (capacidad + sesiones con sus objetivos) y
 * propone la sesión que falta. Es lo que vuelve reeditable el plan del curso:
 * hasta ahora los temas se decidían una sola vez, al crear el curso, y
 * «Agregar sesión» obligaba a inventar el título a mano.
 *
 * Body: { courseId }
 * → { propuesta: { titulo, objetivo, porque } }
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole('ADMIN')
    if (session instanceof NextResponse) return session

    const { courseId } = (await request.json()) as { courseId?: string }
    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 })
    }

    const curso = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        id: true, title: true, capacidad: true, userId: true, scope: true,
        careers: { select: { id: true } }, sedes: { select: { id: true } },
        lessons: { orderBy: { order: 'asc' }, select: { order: true, title: true, objective: true } },
      },
    })
    if (!curso) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

    const puede = isOwnerOrSuperadmin(session, curso.userId) || esAdminDelCurso(session, curso)
    if (!puede) {
      return NextResponse.json({ error: 'No autorizado para este curso' }, { status: 403 })
    }

    const existentes = curso.lessons.length > 0
      ? curso.lessons.map((l) => `${l.order}. ${l.title}${l.objective ? ` — ${l.objective}` : ''}`).join('\n')
      : '(todavía no hay sesiones)'

    const prompt = `Eres diseñador instruccional. Un curso ya tiene su plan de sesiones y el instructor quiere agregar UNA más. Propón la sesión que falta para cubrir la capacidad del curso, en el mismo estilo que las existentes.

CURSO: ${curso.title}
CAPACIDAD: ${curso.capacidad || '(no definida)'}

SESIONES EXISTENTES:
${existentes}

REGLAS:
- No repitas un tema que ya está cubierto.
- El objetivo empieza con UN solo verbo de acción (Identificar, Aplicar, Evaluar, Diseñar…) y sigue el formato "Al finalizar la sesión, el estudiante será capaz de [verbo] [qué] [contexto]".
- Si el plan ya cubre la capacidad, propón la sesión de práctica integradora o de aplicación que más falte.
- Título corto (máximo 8 palabras), sin numeración.

Responde SOLO con este JSON, sin texto adicional:
{"titulo": "…", "objetivo": "Al finalizar la sesión, el estudiante será capaz de …", "porque": "una oración: qué hueco del plan cubre"}`

    const propuesta = await callAndParseJson<{ titulo?: string; objetivo?: string; porque?: string }>(
      prompt,
      { model: DEFAULT_MODEL, maxTokens: 500 }
    )
    if (!propuesta?.titulo?.trim()) {
      return NextResponse.json({ error: 'La IA no devolvió una propuesta válida' }, { status: 502 })
    }

    logger.info('planner.lesson.proposed', { courseId, titulo: propuesta.titulo })
    return NextResponse.json({
      propuesta: {
        titulo: propuesta.titulo.trim(),
        objetivo: propuesta.objetivo?.trim() ?? '',
        porque: propuesta.porque?.trim() ?? '',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error inesperado'
    logger.error('planner.lesson.propose.error', { error: msg })
    return NextResponse.json({ error: msg.split(/\r?\n/)[0] }, { status: 500 })
  }
}
