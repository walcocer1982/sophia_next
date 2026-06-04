import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Threshold: visitantes kiosko sin Google login que llevan más de 2 días
 * inactivos. Antes de mostrar las "Alertas de Inactividad" en el dashboard,
 * borramos sus registros (User + cascade a LessonSession + Message +
 * ActivityProgress). AssessmentParticipant.sessionId tiene onDelete: SetNull,
 * así que el historial de evaluaciones no se rompe.
 *
 * Por qué: usuarios @assessment.local son visitantes del kiosko (sin Google),
 * suelen ser pruebas de feria/demo. Después de 2 días no aportan información
 * útil al instructor — solo ensucian la pantalla con "Hannah", "Walther",
 * "Alcocer" en alertas de inactividad.
 */
const GUEST_EMAIL_SUFFIX = '@assessment.local'
const INACTIVE_THRESHOLD_DAYS = 2

/**
 * Borra guests del kiosko (User con email @assessment.local) cuya última
 * actividad en CUALQUIER sesión sea anterior al threshold. Solo considera
 * guests que tienen al menos una sesión en el courseId dado, para acotar
 * la operación al dashboard que se está cargando.
 *
 * Returns: número de guests borrados.
 */
export async function cleanupInactiveGuestsForCourse(courseId: string): Promise<number> {
  const cutoff = new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  // Buscar guests con al menos una sesión en este curso Y donde TODAS sus
  // sesiones (en cualquier curso) sean anteriores al cutoff. Si tienen una
  // sesión reciente en OTRO curso, no los tocamos.
  const guestsToDelete = await prisma.user.findMany({
    where: {
      email: { endsWith: GUEST_EMAIL_SUFFIX },
      lessonSessions: {
        some: { lesson: { courseId } },
        every: { lastActivityAt: { lt: cutoff } },
      },
    },
    select: { id: true },
  })

  if (guestsToDelete.length === 0) return 0

  const result = await prisma.user.deleteMany({
    where: { id: { in: guestsToDelete.map((g) => g.id) } },
  })

  logger.info('dashboard.cleanup_guests', {
    courseId,
    deletedUsers: result.count,
    thresholdDays: INACTIVE_THRESHOLD_DAYS,
  })

  return result.count
}
