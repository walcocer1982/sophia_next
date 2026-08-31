import type { Prisma } from '@prisma/client'

/**
 * Alcance de visibilidad del staff.
 *
 * La unidad de permiso es la SECCIÓN, no el curso. Un curso es compartido —la
 * tutoría vive en cinco carreras y tres sedes—, así que preguntarle a un curso
 * «¿es tuyo?» no tiene respuesta. Una sección sí está localizada: tiene sede,
 * período, y por su curso tiene carreras. El par sede × carrera que define el
 * alcance de una persona es, literalmente, una sección.
 *
 * Esto importa porque cuatro de las seis carreras (EOM, SI, MMP, MSEII) se
 * dictan en dos sedes. Comparar solo carreras haría que el instructor de SI en
 * ABQ viera también la SI de FCHB, que es de otro.
 */

export type Alcance = {
  id: string
  role?: string | null
  careerId?: string | null
  sedeId?: string | null
}

/** Ningún resultado. Se usa para cerrar en falso ante datos incompletos. */
const NADA: Prisma.SectionWhereInput = { id: { in: [] } }

/**
 * `where` de Prisma con las secciones que esta persona puede ver.
 *
 * Cuatro casos:
 *  - SUPERADMIN            → todo
 *  - sede + carrera        → esa carrera en su sede (+ los transversales de su sede)
 *  - solo sede             → toda su sede (coordinador)
 *  - sin sede              → solo las secciones que dicta
 *
 * El comodín transversal es el caso que no se ve venir: la tutoría no tiene
 * ninguna carrera en `careers`, así que exigir coincidencia de carrera la
 * volvería invisible para todo instructor —que es el único curso que hoy corre.
 * `scope: TRANSVERSAL` significa «sirve a todas las carreras», y así se lee.
 */
export function seccionesVisibles(user: Alcance | null | undefined): Prisma.SectionWhereInput {
  if (!user) return NADA
  if (user.role === 'SUPERADMIN') return {}

  // Las secciones que dicta siempre se ven, tenga o no sede asignada.
  const dicta: Prisma.SectionWhereInput = { instructors: { some: { userId: user.id } } }

  if (!user.sedeId) return dicta

  const enSuSede: Prisma.SectionWhereInput = user.careerId
    ? {
        sedeId: user.sedeId,
        OR: [
          { course: { careers: { some: { id: user.careerId } } } },
          { course: { scope: 'TRANSVERSAL' } },
        ],
      }
    : { sedeId: user.sedeId }

  return { OR: [enSuSede, dicta] }
}

/**
 * ¿Puede tocar este curso? Se responde por sus secciones: si ve alguna sección
 * del curso, el curso es suyo. Un curso sin secciones todavía no está localizado
 * en ninguna sede, así que solo lo ve quien lo creó o el superadmin.
 */
export function cursosVisibles(user: Alcance | null | undefined): Prisma.CourseWhereInput {
  if (!user) return { id: { in: [] } }
  if (user.role === 'SUPERADMIN') return {}
  return {
    OR: [
      { userId: user.id },
      { sections: { some: seccionesVisibles(user) } },
    ],
  }
}

/**
 * Versión en memoria, para cuando ya tenés el curso cargado y no querés otra
 * consulta. `sedes` y `careers` vienen del curso; `scope` decide el comodín.
 */
export function puedeVerCurso(
  user: Alcance | null | undefined,
  curso: { userId?: string | null; scope?: string | null; careerIds?: string[]; sedeIds?: string[] }
): boolean {
  if (!user) return false
  if (user.role === 'SUPERADMIN') return true
  if (curso.userId && curso.userId === user.id) return true
  if (!user.sedeId) return false
  if (curso.sedeIds?.length && !curso.sedeIds.includes(user.sedeId)) return false
  if (!user.careerId) return true // coordinador: toda su sede
  if (curso.scope === 'TRANSVERSAL') return true
  return !!curso.careerIds?.includes(user.careerId)
}

/**
 * Forma mínima de curso que necesita `esAdminDelCurso`. Los sitios que la usan
 * deben pedirle a Prisma `scope`, `careers` y `sedes` — no `careerId`, que es
 * el campo viejo de una sola carrera y no sabe de cursos compartidos.
 */
export type CursoParaPermiso = {
  userId?: string | null
  scope?: string | null
  careers?: { id: string }[]
  sedes?: { id: string }[]
}

/**
 * Reemplaza a `isAdminSameCareer`. Dos diferencias que importan:
 *
 *  1. La sede limita. Antes, un ADMIN de SI veía la SI de las dos sedes.
 *  2. INSTRUCTOR también entra. El modelo acordado es que el instructor es
 *     dueño de su carrera, no solo de las secciones que le asignaron —que hoy
 *     son cero para los cuatro instructores del sistema.
 */
export function esAdminDelCurso(
  session: { user: { id: string; role?: string; careerId?: string | null; sedeId?: string | null } } | null,
  curso: CursoParaPermiso
): boolean {
  if (!session?.user) return false
  const { role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPERADMIN' && role !== 'INSTRUCTOR') return false
  return puedeVerCurso(
    { id: session.user.id, role, careerId: session.user.careerId, sedeId: session.user.sedeId },
    {
      userId: curso.userId,
      scope: curso.scope,
      careerIds: curso.careers?.map((c) => c.id),
      sedeIds: curso.sedes?.map((s) => s.id),
    }
  )
}
