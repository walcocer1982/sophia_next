/**
 * Diagnóstico: vuelca la conversación de un participante del kiosko en orden,
 * para ver qué preguntó Sophia vs qué respondió el alumno (desfase de actividad).
 * Uso: npx tsx scripts/dump-convo.ts [CODE]   (default V77XUV)
 */
import { prisma } from '../lib/prisma'

async function main() {
  const code = (process.argv[2] || 'V77XUV').toUpperCase()
  const assessment = await prisma.assessment.findUnique({
    where: { code },
    select: { id: true },
  })
  if (!assessment) { console.error('no assessment'); process.exit(1) }

  const participant = await prisma.assessmentParticipant.findFirst({
    where: { assessmentId: assessment.id },
    orderBy: { startedAt: 'desc' },
    select: { firstName: true, sessionId: true },
  })
  if (!participant) { console.error('no participant'); process.exit(1) }

  const messages = await prisma.message.findMany({
    where: { sessionId: participant.sessionId ?? '' },
    orderBy: { timestamp: 'asc' },
    select: { role: true, content: true, timestamp: true },
  })

  console.log(`\n👤 ${participant.firstName} — ${messages.length} mensajes\n`)
  for (const m of messages) {
    const who = m.role === 'assistant' ? '🟣 SOPHIA' : '🟢 ALUMNO'
    const txt = m.content.replace(/\s+/g, ' ').trim()
    console.log(`${who}: ${txt.slice(0, 320)}`)
    console.log('')
  }

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
