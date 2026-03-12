import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { CareerFilter } from '@/components/lessons/career-filter'
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern'
import { cn } from '@/lib/utils'

type LessonRow = {
  id: string
  title: string
  slug: string
  keyPoints: string[]
  order: number
  course: {
    title: string
    slug: string
    career: { name: string } | null
  }
}

export default async function LessonsPage() {
  const session = await auth()

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { careerId: true, role: true },
      })
    : null

  const role = user?.role || 'STUDENT'
  const isSuperadmin = role === 'SUPERADMIN'

  // Filter by career for non-SUPERADMIN
  const careerFilter = !isSuperadmin && user?.careerId
    ? { course: { careerId: user.careerId } }
    : {}

  const lessons = (await prisma.lesson.findMany({
    where: {
      isPublished: true,
      ...careerFilter,
    },
    orderBy: [
      { course: { title: 'asc' } },
      { order: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      keyPoints: true,
      order: true,
      course: {
        select: {
          title: true,
          slug: true,
          career: { select: { name: true } },
        },
      },
    },
  })) as LessonRow[]

  // Fetch user's sessions for progress (non-test only)
  const userSessions = session?.user?.id
    ? await prisma.lessonSession.findMany({
        where: {
          userId: session.user.id,
          isTest: false,
        },
        select: {
          lessonId: true,
          completedAt: true,
        },
      })
    : []

  // Build progress map: lessonId → status
  const progressMap = new Map<string, 'completed' | 'in_progress'>()
  for (const s of userSessions) {
    if (s.completedAt) {
      progressMap.set(s.lessonId, 'completed')
    } else if (!progressMap.has(s.lessonId)) {
      progressMap.set(s.lessonId, 'in_progress')
    }
  }

  // Enrich lessons with status and career name
  const enrichedLessons = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    keyPoints: l.keyPoints,
    order: l.order,
    course: {
      title: l.course.title,
      slug: l.course.slug,
      careerName: l.course.career?.name || null,
    },
    status: (progressMap.get(l.id) || 'not_started') as 'completed' | 'in_progress' | 'not_started',
  }))

  // Fetch careers for SUPERADMIN filter
  const careers = isSuperadmin
    ? await prisma.career.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    : []

  return (
    <div className="container relative mx-auto px-4 py-12">
      <InteractiveGridPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
          "inset-x-[20%] inset-y-[-20%] h-[200%] skew-y-12",
        )}
      />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Lecciones Disponibles</h1>
          <p className="text-lg text-muted-foreground">
            Aprende con instructores IA personalizados
          </p>
        </div>

        <CareerFilter
          lessons={enrichedLessons}
          careers={careers}
          showCareerFilter={isSuperadmin}
        />
      </div>
    </div>
  )
}
