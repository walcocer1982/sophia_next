/**
 * Borra usuarios "guest" del kiosko (@assessment.local) que ya no son útiles:
 *  - Su última evaluación terminó hace más de DAYS_OLD días.
 *  - O no tienen ninguna evaluación / sesión asociada (huérfanos).
 *
 * Las filas en AssessmentParticipant usan onDelete: SetNull en sessionId,
 * así que borrar el User no rompe los reportes de evaluación. Las sesiones
 * de lección y mensajes se eliminan en cascada (User -> LessonSession -> Message).
 *
 * Uso: npx tsx scripts/cleanup-guest-users.ts [--dry-run] [--days=30]
 */
import { prisma } from '../lib/prisma'

const DEFAULT_DAYS = 30

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const daysArg = args.find(a => a.startsWith('--days='))
  const days = daysArg ? Number(daysArg.split('=')[1]) : DEFAULT_DAYS
  return { dryRun, days: Number.isFinite(days) && days > 0 ? days : DEFAULT_DAYS }
}

async function main() {
  const { dryRun, days } = parseArgs()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  console.log(
    `Modo: ${dryRun ? 'DRY-RUN' : 'BORRADO REAL'} — antigüedad mínima: ${days} días (antes de ${cutoff.toISOString()})\n`
  )

  const guests = await prisma.user.findMany({
    where: {
      email: { endsWith: '@assessment.local' },
      role: 'STUDENT',
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: { lessonSessions: true },
      },
    },
  })
  console.log(`Total guests encontrados: ${guests.length}`)

  const toDelete: { id: string; email: string; name: string | null; reason: string }[] = []

  for (const g of guests) {
    // Buscar la última participación (terminada o no)
    const lastParticipation = await prisma.assessmentParticipant.findFirst({
      where: {
        OR: [
          { session: { userId: g.id } },
          // Match by name+createdAt as fallback when sessionId is null
        ],
      },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, completedAt: true },
    })

    if (!lastParticipation) {
      // Guest huérfano sin participación — si es viejo, borrar
      if (g.createdAt < cutoff) {
        toDelete.push({
          id: g.id,
          email: g.email,
          name: g.name,
          reason: `huérfano, creado ${g.createdAt.toISOString()}`,
        })
      }
      continue
    }

    const lastActivity = lastParticipation.completedAt || lastParticipation.startedAt
    if (lastActivity < cutoff) {
      toDelete.push({
        id: g.id,
        email: g.email,
        name: g.name,
        reason: `última actividad ${lastActivity.toISOString()}`,
      })
    }
  }

  console.log(`\nA borrar: ${toDelete.length}`)
  for (const u of toDelete.slice(0, 20)) {
    console.log(`  - ${u.name || '(sin nombre)'} | ${u.email} | ${u.reason}`)
  }
  if (toDelete.length > 20) console.log(`  ... y ${toDelete.length - 20} más`)

  if (dryRun) {
    console.log('\nDry-run: no se borró nada. Quita --dry-run para ejecutar.')
    return
  }

  if (toDelete.length === 0) {
    console.log('\nNada que borrar.')
    return
  }

  const ids = toDelete.map(u => u.id)
  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`\n✓ Borrados ${result.count} guest users.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
