import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { ImageBank } from '@/components/planner/image-bank'
import { cursoEditable } from '@/lib/planner/course-access'

/** Banco de imágenes del curso. Spec: investigacion/panel-de-apoyo-especificacion.md §9.3 */
export default async function ImageBankPage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { courseId } = await params
  const course = await cursoEditable(session, courseId)
  if (!course) notFound()
  return <ImageBank courseId={courseId} courseTitle={course.title} />
}
