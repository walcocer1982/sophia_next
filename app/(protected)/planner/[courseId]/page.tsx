import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isOwnerOrSuperadmin, isAdminSameCareer } from '@/lib/auth-utils'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Pencil, Image, ClipboardCheck, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublishToggle } from '@/components/planner/publish-toggle'
import { TestLessonButton } from '@/components/planner/test-lesson-button'
import { DeleteCourseButton } from '@/components/planner/delete-course-button'
import { CourseCareerSelector } from '@/components/planner/course-career-selector'

type CourseWithLessons = {
  id: string
  title: string
  capacidad: string | null
  instructor: string
  isPublished: boolean
  lessons: Array<{
    id: string
    title: string
    objective: string
    order: number
    keyPoints: string[]
    contentJson: unknown
    isPublished: boolean
    availableAt: Date | null
    closesAfterHours: number
  }>
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { courseId } = await params

  const [course, careers] = await Promise.all([
    prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      capacidad: true,
      instructor: true,
      isPublished: true,
      userId: true,
      careerId: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          objective: true,
          order: true,
          keyPoints: true,
          contentJson: true,
          isPublished: true,
          availableAt: true,
          closesAfterHours: true,
        },
      },
    },
  }) as Promise<(CourseWithLessons & { userId: string | null; careerId: string | null }) | null>,
    prisma.career.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  if (!course) notFound()

  // Check if user is lead instructor, SUPERADMIN, career-match ADMIN, or section instructor
  const isLeadOrSuper = isOwnerOrSuperadmin(session, course.userId)
  const isCareerAdmin = !isLeadOrSuper && isAdminSameCareer(session, course.careerId)
  const sectionInstructor = !isLeadOrSuper && !isCareerAdmin
    ? await prisma.sectionInstructor.findFirst({
        where: { userId: session.user.id, section: { courseId } },
        include: { section: { select: { id: true, name: true, period: { select: { name: true } } } } },
      })
    : null

  if (!isLeadOrSuper && !isCareerAdmin && !sectionInstructor) {
    notFound()
  }

  // Career admins can publish but not edit design (same as section instructors)
  const isSectionInstructor = (!!sectionInstructor || isCareerAdmin) && !isLeadOrSuper

  // Get sections for this course (for section/career instructor publish)
  const courseSections = isSectionInstructor
    ? await prisma.section.findMany({
        where: {
          courseId,
          // Career admins see all sections; section instructors see only assigned
          ...(isCareerAdmin ? {} : { instructors: { some: { userId: session.user.id } } }),
        },
        select: {
          id: true,
          name: true,
          period: { select: { name: true } },
          schedules: {
            select: { lessonId: true, availableAt: true, closesAfterHours: true },
          },
        },
      })
    : []

  // Get test sessions for this course's lessons
  const lessonIds = course.lessons.map((l) => l.id)
  const testSessions = await prisma.lessonSession.findMany({
    where: { lessonId: { in: lessonIds }, isTest: true },
    select: { lessonId: true },
    distinct: ['lessonId'],
  })
  const testedLessonIds = new Set(testSessions.map((s) => s.lessonId))

  const designedCount = course.lessons.filter((l) => {
    const json = l.contentJson as { activities?: unknown[] } | null
    return json?.activities && json.activities.length > 0
  }).length

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        href="/planner"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis Cursos
      </Link>

      {/* Course header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">{course.title}</h1>
            {course.capacidad && (
              <p className="max-w-2xl text-muted-foreground">
                {course.capacidad}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!course.isPublished && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                Borrador
              </span>
            )}
            <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>{course.lessons.length} sesiones</span>
          <span className="text-gray-300">|</span>
          <span>{designedCount} diseñadas</span>
          {!isSectionInstructor && (
            <>
              <span className="text-gray-300">|</span>
              <CourseCareerSelector
                courseId={course.id}
                currentCareerId={course.careerId}
                careers={careers}
              />
            </>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Sesiones</h2>

        {course.lessons.map((lesson) => {
          const json = lesson.contentJson as { activities?: Array<{
            id: string
            type: string
            verified?: boolean
            teaching?: {
              agent_instruction: string
              images?: Array<{ url: string }>
              image?: { url: string }
            }
          }> } | null
          const isDesigned =
            json?.activities && json.activities.length > 0
          const hasResources = json?.activities?.some(
            (a) => (a.teaching?.images && a.teaching.images.length > 0) || a.teaching?.image?.url
          ) ?? false
          const allVerified = isDesigned && json!.activities!.every((a) => a.verified === true)
          const isTested = testedLessonIds.has(lesson.id)

          const badges = [
            { label: 'Diseñada', done: !!isDesigned },
            { label: 'Verificada', done: !!allVerified },
            { label: 'Recursos', done: hasResources },
            { label: 'Probada', done: isTested },
            { label: 'Publicada', done: lesson.isPublished },
          ]

          return (
            <div
              key={lesson.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4"
            >
              {/* Status icon */}
              {isDesigned ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300" />
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">
                    {lesson.order}.
                  </span>
                  <h3 className="font-medium text-gray-800">
                    {lesson.title}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {lesson.objective}
                </p>
                {/* Status badges */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        b.done
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {b.done && <Check className="mr-0.5 h-2.5 w-2.5" />}
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 gap-2">
                {/* Lead instructor / SUPERADMIN: full editing */}
                {!isSectionInstructor && (
                  <>
                    <Link href={`/planner/${courseId}/${lesson.id}`}>
                      <Button
                        variant={isDesigned ? 'outline' : 'default'}
                        size="sm"
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Diseño
                      </Button>
                    </Link>
                    {isDesigned && (
                      <>
                        <Link href={`/planner/${courseId}/${lesson.id}/verification`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`gap-1.5 ${allVerified ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}`}
                          >
                            {allVerified ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            )}
                            Verificación
                          </Button>
                        </Link>
                        <Link href={`/planner/${courseId}/${lesson.id}/resources`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`gap-1.5 ${hasResources ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''}`}
                          >
                            {hasResources ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Image className="h-3.5 w-3.5" />
                            )}
                            Recursos
                          </Button>
                        </Link>
                        <TestLessonButton
                          lessonId={lesson.id}
                          activities={(json?.activities || []).map((a) => ({
                            id: a.id,
                            type: a.type,
                            title: a.teaching?.agent_instruction || '',
                          }))}
                        />
                        <Link href={`/planner/${courseId}/${lesson.id}/assessments`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Evaluaciones
                          </Button>
                        </Link>
                        <PublishToggle
                          lessonId={lesson.id}
                          initialPublished={lesson.isPublished}
                          initialAvailableAt={lesson.availableAt?.toISOString() || null}
                          initialClosesAfterHours={lesson.closesAfterHours}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Section instructor: only publish for their section */}
                {isSectionInstructor && isDesigned && courseSections.map(sec => {
                  const schedule = sec.schedules.find(s => s.lessonId === lesson.id)
                  return (
                    <PublishToggle
                      key={sec.id}
                      lessonId={lesson.id}
                      initialPublished={!!schedule?.availableAt}
                      initialAvailableAt={schedule?.availableAt?.toISOString() || null}
                      initialClosesAfterHours={schedule?.closesAfterHours || 3}
                      sectionId={sec.id}
                      sectionLabel={`${sec.period.name} ${sec.name}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
