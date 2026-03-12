import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { CourseSaveSchema } from '@/lib/planner/validation'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80)
}

const DEFAULT_INSTRUCTOR = `Eres un instructor experto y paciente.
Usas analogías simples y ejemplos del mundo real.
Hablas de manera conversacional, como un mentor amigable.
Nunca usas emojis ni exclamaciones exageradas.`

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role || 'STUDENT'
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = CourseSaveSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { titulo, capacidad, temas } = parseResult.data
  // aprendizajes are stored implicitly via temas[].objetivo

  // Generate unique slug
  let baseSlug = slugify(titulo)
  let slug = baseSlug
  let counter = 1
  while (await prisma.course.findFirst({ where: { slug, deletedAt: null } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  try {
    // Auto-assign career from instructor
    const instructor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { careerId: true },
    })

    const course = await prisma.course.create({
      data: {
        title: titulo,
        slug,
        capacidad,
        instructor: DEFAULT_INSTRUCTOR,
        userId: session.user.id,
        careerId: instructor?.careerId || null,
        isPublished: false,
        lessons: {
          create: temas.map((tema, index) => {
            const lessonSlug = `${slug}-${slugify(tema.titulo)}`
            return {
              title: tema.titulo,
              slug: lessonSlug,
              objective: tema.objetivo,
              keyPoints: [],
              order: index + 1,
              isPublished: false,
              contentJson: { activities: [] },
            }
          }),
        },
      },
    })

    return NextResponse.json({
      courseId: course.id,
      slug: course.slug,
      lessonsCreated: temas.length,
    })
  } catch (error) {
    console.error('Course save error:', error)
    return NextResponse.json(
      { error: 'Error al guardar el curso' },
      { status: 500 }
    )
  }
}
