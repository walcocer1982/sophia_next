import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.lessonSession.findMany({
    take: 5,
    orderBy: { lastActivityAt: 'desc' },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
        take: 25
      },
      lesson: {
        select: { title: true }
      },
      activities: {
        orderBy: { startedAt: 'desc' }
      }
    }
  })

  for (const session of sessions) {
    console.log('\n' + '='.repeat(80))
    console.log('SESSION:', session.id)
    console.log('LESSON:', session.lesson?.title)
    console.log('CURRENT ACTIVITY ID:', session.activityId)
    console.log('PROGRESS:', session.progress + '%')
    console.log('MESSAGES:', session.messages.length)
    console.log('='.repeat(80))

    // Mostrar actividades y sus intentos
    console.log('\nACTIVITY PROGRESS:')
    for (const act of session.activities) {
      console.log(`  - ${act.activityId}: ${act.status} (${act.attempts} attempts)`)
    }

    console.log('\nMENSAJES (cronológico):')
    console.log('-'.repeat(80))

    session.messages.forEach((m, i) => {
      const role = m.role === 'user' ? '👤 ESTUDIANTE' : '🤖 INSTRUCTOR'
      const content = m.content.substring(0, 200).replace(/\n/g, ' ')
      console.log(`\n[${i+1}] ${role} (activity: ${m.activityId || 'N/A'}):`)
      console.log(`    "${content}${m.content.length > 200 ? '...' : ''}"`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
