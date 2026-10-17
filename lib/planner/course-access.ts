/**
 * Quién puede editar el diseño de un curso: el dueño, SUPERADMIN o un ADMIN
 * de la carrera y sede del curso. Mismo criterio que las rutas de guardado del
 * planner (`/api/planner/session/save` y `/update`), en un solo lugar para el
 * material de apoyo y el banco de imágenes.
 */
import { isOwnerOrSuperadmin } from '@/lib/auth-utils'
import { esAdminDelCurso } from '@/lib/alcance'
import { prisma } from '@/lib/prisma'

type SesionConUsuario = {
  user: { id: string; role?: string; careerId?: string | null; sedeId?: string | null }
}

const ROLES_DE_DISENO = new Set(['ADMIN', 'SUPERADMIN'])

export async function cursoEditable(session: SesionConUsuario, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      userId: true,
      scope: true,
      careers: { select: { id: true } },
      sedes: { select: { id: true } },
    },
  })
  if (!course) return null
  const puede =
    isOwnerOrSuperadmin(session, course.userId) ||
    (ROLES_DE_DISENO.has(session.user.role ?? '') && esAdminDelCurso(session, course))
  return puede ? course : null
}
