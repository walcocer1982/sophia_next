/**
 * Borra los usuarios invitados del kiosko de ferias (`…@assessment.local`).
 *
 * Eran cascarones creados en /eval para colgar una AssessmentParticipant; con
 * el kiosko retirado (14 set 2026) no tienen padrón, ni carrera, ni forma de
 * entrar. Sus sesiones y mensajes caen en cascada. Los cursos de feria (EPP,
 * Introducción a la Minería) ya estaban con deletedAt; sus lecciones quedan.
 *
 *   npx tsx scripts/borrar-invitados-kiosko.ts            # solo contar
 *   npx tsx scripts/borrar-invitados-kiosko.ts --aplicar  # borrar
 */
import { prisma } from '../lib/prisma'

const aplicar = process.argv.includes('--aplicar')

async function main() {
  const where = { email: { endsWith: '@assessment.local' } }
  const invitados = await prisma.user.findMany({
    where,
    select: { id: true, _count: { select: { lessonSessions: true } } },
  })
  const sesiones = invitados.reduce((s, u) => s + u._count.lessonSessions, 0)
  console.log(`${invitados.length} invitados · ${sesiones} sesiones`)
  if (!aplicar) {
    console.log('nada borrado (usa --aplicar)')
    return
  }
  const r = await prisma.user.deleteMany({ where })
  console.log(`borrados: ${r.count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
