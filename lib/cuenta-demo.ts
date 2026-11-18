/**
 * Cuenta de demostración (18 nov 2026, stand de Marketing del 23–24 nov): un
 * alumno matriculado en una sección cuyo nombre empieza con «Demo». Ve las
 * clases como cualquier alumno, pero sus sesiones son de prueba: puede
 * reiniciarlas cuando quiera y no cuentan en el Monitor ni en las notas.
 *
 * Se decide por la sección y no por el correo para no guardar correos en el
 * código: al archivar la sección, la cuenta vuelve a ser un alumno común.
 */
import { prisma } from '@/lib/prisma'

export const PREFIJO_SECCION_DEMO = 'demo'

export function esNombreDeSeccionDemo(nombre: string): boolean {
  return nombre.trim().toLowerCase().startsWith(PREFIJO_SECCION_DEMO)
}

export async function esCuentaDemo(userId: string): Promise<boolean> {
  const n = await prisma.enrollment.count({
    where: {
      userId,
      section: { isArchived: false, name: { startsWith: PREFIJO_SECCION_DEMO, mode: 'insensitive' } },
    },
  })
  return n > 0
}
