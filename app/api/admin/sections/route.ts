import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isOwnerOrSuperadmin } from '@/lib/auth-utils'

export const runtime = 'nodejs'

// GET /api/admin/sections?courseId=xxx — List sections for a course
export async function GET(request: Request) {
  const result = await requireRole('ADMIN')
  if (result instanceof NextResponse) return result

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 })
  }

  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: [{ period: { name: 'desc' } }, { name: 'asc' }],
    include: {
      period: { select: { id: true, name: true } },
      instructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  })

  return NextResponse.json(sections)
}

// POST /api/admin/sections — Create a section (SUPERADMIN or course lead)
export async function POST(request: Request) {
  const session = await requireRole('ADMIN')
  if (session instanceof NextResponse) return session

  const { courseId, periodId, name, sedeId } = (await request.json()) as {
    courseId: string
    periodId: string
    name: string
    sedeId?: string | null
  }

  if (!courseId || !periodId || !name?.trim()) {
    return NextResponse.json({ error: 'courseId, periodId y nombre requeridos' }, { status: 400 })
  }

  // Validar sede si se provee (debe existir y estar activa)
  if (sedeId) {
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
      select: { id: true, isActive: true },
    })
    if (!sede || !sede.isActive) {
      return NextResponse.json({ error: 'Sede inválida o inactiva' }, { status: 400 })
    }
  }

  // Verify course exists and user has access
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { userId: true },
  })

  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
  }

  if (!isOwnerOrSuperadmin(session, course.userId)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Check duplicate solo contra secciones NO archivadas Y de la misma sede.
  // "Junio" puede existir simultáneamente en ABQ y en IRQ — son cohorts
  // distintas porque la sede las diferencia. Lo que NO se permite: dos
  // "Junio" activas en la misma sede del mismo curso+período.
  const cleanName = name.trim()
  const normalizedSedeId = sedeId || null
  const activeDup = await prisma.section.findFirst({
    where: {
      courseId,
      periodId,
      name: cleanName,
      sedeId: normalizedSedeId,
      isArchived: false,
    },
    select: { id: true },
  })
  if (activeDup) {
    const scope = normalizedSedeId ? 'en esta sede' : 'sin sede asignada'
    return NextResponse.json(
      { error: `Ya existe una sección activa "${cleanName}" ${scope} en este curso y período` },
      { status: 409 }
    )
  }

  // Si hay una archivada con el mismo nombre+sede, avisamos como hint (no error).
  const archivedDup = await prisma.section.findFirst({
    where: {
      courseId,
      periodId,
      name: cleanName,
      sedeId: normalizedSedeId,
      isArchived: true,
    },
    select: { id: true, archivedAt: true },
  })

  const section = await prisma.section.create({
    data: {
      courseId,
      periodId,
      name: cleanName,
      sedeId: sedeId || null,
    },
    include: {
      period: { select: { name: true } },
      sede: { select: { id: true, code: true, name: true } },
    },
  })

  return NextResponse.json(
    {
      ...section,
      // Hint para el cliente: si había una archivada con el mismo nombre, lo
      // mencionamos como info (no es un error).
      _hint: archivedDup
        ? `Nota: existe una sección archivada con este mismo nombre (id: ${archivedDup.id}).`
        : null,
    },
    { status: 201 }
  )
}
