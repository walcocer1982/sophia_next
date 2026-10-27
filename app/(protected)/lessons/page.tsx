import { auth } from '@/auth'
import { cierreDeVentana } from '@/lib/monitor'
import { programadaParaElAlumno } from '@/lib/lecciones-alumno'
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

  // Filter by career for non-SUPERADMIN (include transversal courses with careerId=null).
  // Un curso borrado no se muestra a nadie (27 oct 2026: AI 101 y EPPs seguían en el inicio).
  const courseFilter = {
    deletedAt: null,
    ...(!isSuperadmin && user?.careerId ? { OR: [{ careerId: user.careerId }, { careerId: null }] } : {}),
  }

  // Get student's enrollments to look up section schedules
  const studentEnrollments = session?.user?.id
    ? await prisma.enrollment.findMany({
        // Solo secciones activas: una archivada ya no programa nada.
        where: { userId: session.user.id, section: { isArchived: false } },
        select: { sectionId: true, section: { select: { courseId: true } } },
      })
    : []
  const enrollmentByCourse = new Map(
    studentEnrollments.map(e => [e.section.courseId, e.sectionId])
  )

  const lessons = (await prisma.lesson.findMany({
    where: {
      isPublished: true,
      course: courseFilter,
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
      courseId: true,
      availableAt: true,
      closesAfterHours: true,
      course: {
        select: {
          title: true,
          slug: true,
          career: { select: { name: true } },
        },
      },
      sectionSchedules: {
        select: {
          sectionId: true,
          availableAt: true,
          closesAfterHours: true,
          closedAt: true,
        },
      },
    },
  })) as (LessonRow & {
    courseId: string
    availableAt: Date | null
    closesAfterHours: number
    sectionSchedules: Array<{ sectionId: string; availableAt: Date | null; closesAfterHours: number; closedAt: Date | null }>
  })[]

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

  const now = new Date()

  // Enrich lessons with status, career name, and availability
  const enrichedLessons = lessons.map((l) => {
    // Use section schedule if student is enrolled in a section for this course
    const studentSectionId = enrollmentByCourse.get(l.courseId)
    const sectionSchedule = studentSectionId
      ? l.sectionSchedules.find(s => s.sectionId === studentSectionId)
      : null

    const effectiveAvailableAt = sectionSchedule?.availableAt ?? l.availableAt
    const effectiveClosesAfterHours = sectionSchedule?.closesAfterHours ?? l.closesAfterHours

    const availableDate = effectiveAvailableAt ? new Date(effectiveAvailableAt) : null
    const isOpen = !availableDate || availableDate <= now
    const closesAt = cierreDeVentana(availableDate, effectiveClosesAfterHours, sectionSchedule?.closedAt)
    const isClosed = closesAt ? now > closesAt : false
    const isAvailable = isOpen && !isClosed

    return {
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
      isAvailable,
      isClosed,
      programada: programadaParaElAlumno({ seccionDelAlumno: studentSectionId ?? null, horario: sectionSchedule ?? null, cerrada: isClosed }),
      // Fecha EFECTIVA (programación de la sección del estudiante, con
      // fallback a la general). Antes se pasaba siempre la general y la card
      // mostraba una fecha vieja aunque la sección tuviera horario propio.
      availableAt: availableDate?.toISOString() || null,
      closesAt: closesAt?.toISOString() || null,
    }
  })

  // El alumno ve solo lo que su sección programó, abierto o por venir (26 y 27 oct
  // 2026, pedidos de Walther; lib/lecciones-alumno.ts). Lo que hizo queda en el
  // Monitor. Instructores y administradores ven todo.
  const leccionesVisibles = role === 'STUDENT' ? enrichedLessons.filter((l) => l.programada) : enrichedLessons

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
          lessons={leccionesVisibles}
          careers={careers}
          showCareerFilter={isSuperadmin}
        />
      </div>
    </div>
  )
}
