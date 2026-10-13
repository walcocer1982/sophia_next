import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { MaterialManager } from '@/components/planner/material/material-manager'
import { cursoEditable } from '@/lib/planner/course-access'
import { migrateLegacyImages } from '@/lib/material-editor'
import type { Activity, LessonContent } from '@/types/lesson'

type LessonRow = { id: string; title: string; courseId: string; contentJson: unknown }

/**
 * «Material de apoyo» de una lección (antes «Recursos», solo imágenes).
 * Entra quien puede guardar el diseño del curso: dueño, SUPERADMIN o ADMIN de
 * la carrera (antes solo dueño o SUPERADMIN, aunque la ruta de guardado
 * admitía al ADMIN de la carrera).
 */
export default async function MaterialPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { courseId, lessonId } = await params
  const course = await cursoEditable(session, courseId)
  if (!course) notFound()

  const lesson = (await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, courseId: true, contentJson: true },
  })) as LessonRow | null
  if (!lesson || lesson.courseId !== courseId) notFound()

  const contenido = lesson.contentJson as LessonContent | null
  const originales = (contenido?.activities ?? []) as Activity[]
  if (originales.length === 0) notFound()

  const convertidas = originales.map(migrateLegacyImages)
  const migrated = convertidas.some((a, i) => a !== originales[i])

  // Una imagen que ya está en el banco del curso se enlaza por su url: así
  // validarla o corregir su licencia en el banco llega a esta lección.
  const banco = await prisma.courseImage.findMany({ where: { courseId }, select: { id: true, url: true } })
  const porUrl = new Map(banco.map((b) => [b.url, b.id]))
  const activities = convertidas.map((a) => {
    const blocks = a.teaching.blocks
    if (!blocks?.some((b) => b.type === 'image' && !b.bankId && porUrl.has(b.url))) return a
    return {
      ...a,
      teaching: {
        ...a.teaching,
        blocks: blocks.map((b) => (b.type === 'image' && !b.bankId && porUrl.has(b.url) ? { ...b, bankId: porUrl.get(b.url) } : b)),
      },
    }
  })

  return (
    <MaterialManager
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      courseId={courseId}
      courseTitle={course.title}
      activities={activities}
      migrated={migrated}
      referencias={contenido?.context?.referencias ?? []}
      imageFolder={`sophia/${courseId}/${lessonId}`}
    />
  )
}
