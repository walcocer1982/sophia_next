import { prisma } from '@/lib/prisma'
import { cierreDeVentana } from '@/lib/monitor'
import { formatTime } from '@/lib/formatters'

/**
 * Cuándo cierra una lección para ESTE alumno: el horario de su sección (con el
 * cierre del instructor, si lo hubo) o, si su sección no la programó, el de la
 * lección. Lo usan la pantalla de la lección y las dos rutas del chat, para que
 * «Terminar el bloque» en el Monitor pare a Sophia de verdad (22 oct 2026).
 */
export async function cierreParaAlumno(
  userId: string,
  lesson: { id: string; courseId: string; availableAt: Date | null; closesAfterHours: number }
): Promise<Date | null> {
  const matricula = await prisma.enrollment.findFirst({
    where: { userId, section: { courseId: lesson.courseId } },
    select: {
      section: {
        select: {
          schedules: {
            where: { lessonId: lesson.id },
            select: { availableAt: true, closesAfterHours: true, closedAt: true },
          },
        },
      },
    },
  })
  const h = matricula?.section.schedules[0]
  return h ? cierreDeVentana(h.availableAt, h.closesAfterHours, h.closedAt) : cierreDeVentana(lesson.availableAt, lesson.closesAfterHours)
}

export const ventanaPaso = (cierre: Date | null, ahora = new Date()): boolean => !!cierre && cierre.getTime() <= ahora.getTime()

/** Lo que Sophia responde si el alumno escribe después del cierre: fijo, sin modelo. */
export function mensajeBloqueCerrado(cierre: Date): string {
  // La hora va entre paréntesis: «p. m.» ya termina en punto.
  return `El bloque con Sophia terminó (${formatTime(cierre)}). Lo que escribiste quedó guardado; ahora sigue el instructor con la clase.`
}
