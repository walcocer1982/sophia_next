import { requireRole } from '@/lib/auth-utils'
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
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

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

  const { titulo, capacidad, careerId: explicitCareerId, temas } = parseResult.data
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
    // Use explicit careerId if provided, otherwise auto-assign from instructor
    let finalCareerId: string | null = null
    if (explicitCareerId !== undefined) {
      finalCareerId = explicitCareerId
    } else {
      const instructor = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { careerId: true },
      })
      finalCareerId = instructor?.careerId || null
    }

    const course = await prisma.course.create({
      data: {
        title: titulo,
        slug,
        capacidad,
        instructor: DEFAULT_INSTRUCTOR,
        userId: session.user.id,
        careerId: finalCareerId,
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
