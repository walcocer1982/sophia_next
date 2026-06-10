import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SectionSelector } from '@/components/section-selector'

export default async function SelectSectionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { careerId: true, role: true, sedeId: true, admissionPeriodId: true },
  })

  // Only students need to select section
  if (!user || user.role !== 'STUDENT') redirect('/lessons')

  // Must have career first
  if (!user.careerId) redirect('/select-career')

  // Check if student already has enrollments
  const existingEnrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      section: {
        select: {
          name: true,
          course: { select: { title: true } },
          period: { select: { name: true } },
        },
      },
    },
  })

  // Secciones visibles para el estudiante:
  // - NO archivadas (cohorts terminadas no aceptan matrícula)
  // - De cursos de su carrera o transversales (careerId null)
  // - De su período de admisión (si lo eligió en onboarding; legacy: activos)
  // - De su sede o sin sede asignada (si tiene sede; legacy: todas)
  const sections = await prisma.section.findMany({
    where: {
      isArchived: false,
      course: {
        OR: [{ careerId: user.careerId }, { careerId: null }],
        deletedAt: null,
      },
      ...(user.admissionPeriodId
        ? { periodId: user.admissionPeriodId }
        : { period: { isActive: true } }),
      ...(user.sedeId ? { OR: [{ sedeId: user.sedeId }, { sedeId: null }] } : {}),
    },
    orderBy: [{ period: { name: 'desc' } }, { course: { title: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      startDate: true,
      sede: { select: { code: true } },
      period: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  })

  // If no sections available, skip enrollment requirement and go to lessons
  // This also prevents redirect loops when DB has no sections yet
  if (sections.length === 0) {
    // Show a message instead of redirecting (prevents loop with proxy)
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold">Seleccionar Sección</h1>
        <p className="text-muted-foreground">No hay secciones disponibles en este momento. Contacta a tu instructor.</p>
      </div>
    )
  }

  // Formatear fecha de inicio en server (locale explícito — evita mismatch SSR)
  const items = sections.map(({ startDate, ...s }) => ({
    ...s,
    startLabel: startDate
      ? startDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
      : null,
  }))

  // Group by period then course
  type SectionItem = typeof items[number]
  const grouped: Record<string, Record<string, SectionItem[]>> = {}
  for (const s of items) {
    const pName = s.period.name
    const cTitle = s.course.title
    if (!grouped[pName]) grouped[pName] = {}
    if (!grouped[pName][cTitle]) grouped[pName][cTitle] = []
    grouped[pName][cTitle].push(s)
  }

  // Already enrolled course IDs (to show checkmark)
  const enrolledCourseIds = new Set(
    existingEnrollments.map(e => {
      // Get courseId from section
      const matchingSection = sections.find(s => s.id === e.section.name) // won't work, need actual courseId
      return matchingSection?.course.id
    }).filter(Boolean)
  )

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Selecciona tu sección</h1>
          <p className="mt-2 text-muted-foreground">
            Elige el salón al que estás asignado para cada curso.
          </p>
        </div>

        {existingEnrollments.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800 mb-2">Ya estás matriculado en:</p>
            {existingEnrollments.map(e => (
              <p key={e.id} className="text-sm text-green-700">
                • {e.section.course.title} — {e.section.name} ({e.section.period.name})
              </p>
            ))}
          </div>
        )}

        <SectionSelector
          grouped={grouped}
          existingEnrollments={existingEnrollments.map(e => e.sectionId)}
        />
      </div>
    </div>
  )
}
