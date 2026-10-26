/**
 * Unir una cuenta duplicada a la del padrón (26 oct 2026, ver lib/cuenta-duplicada.ts).
 *
 * Todo lo del alumno pasa a la cuenta del padrón: sesiones (con sus mensajes y
 * progreso), matrículas, marcas de seguimiento y el acceso de Google, para que
 * la próxima vez que entre con ese correo llegue a la cuenta del padrón
 * (auth.ts busca primero el acceso). La duplicada no se borra: queda vacía con
 * `unidaA`, así un token abierto con ella se redirige en el siguiente pedido
 * (Cuellar estaba en plena clase) y su correo no vuelve a crear otra cuenta.
 */
import { prisma } from '@/lib/prisma'

export type ResultadoUnion = { sesiones: number; matriculas: number; seguimientos: number; accesos: number }

/** La cuenta a la que llega un id, siguiendo `unidaA` (a lo más 3 saltos). */
export async function idFinal(id: string): Promise<string> {
  let actual = id
  for (let i = 0; i < 3; i++) {
    const u = await prisma.user.findUnique({ where: { id: actual }, select: { unidaA: true } })
    if (!u?.unidaA) return actual
    actual = u.unidaA
  }
  return actual
}

export async function unirCuentas(duplicadaId: string, padronId: string): Promise<ResultadoUnion> {
  if (duplicadaId === padronId) throw new Error('Es la misma cuenta')
  return prisma.$transaction(async (tx) => {
    const [dup, padron] = await Promise.all([
      tx.user.findUnique({
        where: { id: duplicadaId },
        select: { id: true, dni: true, role: true, unidaA: true, googleId: true, image: true, careerId: true, sedeId: true, admissionPeriodId: true, _count: { select: { courses: true, sectionInstructors: true } } },
      }),
      tx.user.findUnique({
        where: { id: padronId },
        select: { id: true, dni: true, role: true, unidaA: true, googleId: true, image: true, careerId: true, sedeId: true, admissionPeriodId: true },
      }),
    ])
    if (!dup || !padron) throw new Error('Cuenta no encontrada')
    if (!padron.dni) throw new Error('La cuenta de destino no es del padrón (sin DNI)')
    if (dup.dni) throw new Error('La cuenta duplicada tiene DNI: las dos son del padrón')
    if (dup.unidaA || padron.unidaA) throw new Error('Una de las cuentas ya fue unida a otra')
    if (dup.role !== 'STUDENT' || padron.role !== 'STUDENT') throw new Error('Solo se unen cuentas de alumno')
    if (dup._count.courses || dup._count.sectionInstructors) throw new Error('La cuenta duplicada tiene cursos o secciones a cargo')

    // Sesiones: el número de intento es único por alumno y lección; si choca con
    // una del padrón, la que llega toma el siguiente.
    const sesionesDup = await tx.lessonSession.findMany({
      where: { userId: dup.id },
      orderBy: { startedAt: 'asc' },
      select: { id: true, lessonId: true, sessionAttempt: true },
    })
    const delPadron = await tx.lessonSession.findMany({ where: { userId: padron.id }, select: { lessonId: true, sessionAttempt: true } })
    const ocupados = new Map<string, Set<number>>()
    for (const s of delPadron) {
      if (!ocupados.has(s.lessonId)) ocupados.set(s.lessonId, new Set())
      ocupados.get(s.lessonId)!.add(s.sessionAttempt)
    }
    for (const s of sesionesDup) {
      const usados = ocupados.get(s.lessonId) ?? new Set<number>()
      let intento = s.sessionAttempt
      while (usados.has(intento)) intento++
      usados.add(intento)
      ocupados.set(s.lessonId, usados)
      await tx.lessonSession.update({ where: { id: s.id }, data: { userId: padron.id, sessionAttempt: intento } })
    }

    // Matrículas: la sección que el padrón ya tiene no se duplica.
    const matriculasDup = await tx.enrollment.findMany({ where: { userId: dup.id }, select: { id: true, sectionId: true } })
    const seccionesPadron = new Set(
      (await tx.enrollment.findMany({ where: { userId: padron.id }, select: { sectionId: true } })).map((e) => e.sectionId)
    )
    let matriculas = 0
    for (const e of matriculasDup) {
      if (seccionesPadron.has(e.sectionId)) {
        await tx.enrollment.delete({ where: { id: e.id } })
      } else {
        await tx.enrollment.update({ where: { id: e.id }, data: { userId: padron.id } })
        matriculas++
      }
    }

    const seguimientos = (await tx.seguimientoAlumno.updateMany({ where: { userId: dup.id }, data: { userId: padron.id } })).count
    const accesos = (await tx.account.updateMany({ where: { userId: dup.id }, data: { userId: padron.id } })).count

    // googleId es único: se libera en la duplicada antes de dárselo al padrón.
    await tx.user.update({ where: { id: dup.id }, data: { unidaA: padron.id, unidaEn: new Date(), googleId: null } })
    await tx.user.update({
      where: { id: padron.id },
      data: {
        ...(!padron.googleId && dup.googleId ? { googleId: dup.googleId } : {}),
        ...(!padron.image && dup.image ? { image: dup.image } : {}),
        ...(!padron.careerId && dup.careerId ? { careerId: dup.careerId } : {}),
        ...(!padron.sedeId && dup.sedeId ? { sedeId: dup.sedeId } : {}),
        ...(!padron.admissionPeriodId && dup.admissionPeriodId ? { admissionPeriodId: dup.admissionPeriodId } : {}),
      },
    })

    return { sesiones: sesionesDup.length, matriculas, seguimientos, accesos }
  }, { maxWait: 10_000, timeout: 30_000 }) // cada consulta a Neon es ~200 ms y una cuenta puede traer 8 sesiones
}
