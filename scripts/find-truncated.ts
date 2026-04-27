import { prisma } from '../lib/prisma'

async function main() {
  // Find math course
  const course = await prisma.course.findFirst({
    where: { title: { contains: 'matem', mode: 'insensitive' }, deletedAt: null },
    select: { id: true, title: true, lessons: { select: { id: true, title: true } } },
  })

  if (!course) { console.log('No math course found'); return }
  console.log('Curso:', course.title)
  console.log('Lecciones:', course.lessons.length)

  const lessonIds = course.lessons.map(l => l.id)

  // Find sessions for these lessons
  const sessions = await prisma.lessonSession.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { id: true, lessonId: true, userId: true, user: { select: { name: true } }, isTest: true },
  })

  console.log('Sesiones:', sessions.length)

  const sessionIds = sessions.map(s => s.id)

  // Find assistant messages
  const messages = await prisma.message.findMany({
    where: {
      sessionId: { in: sessionIds },
      role: 'assistant',
    },
    select: { id: true, sessionId: true, content: true, outputTokens: true, timestamp: true },
    orderBy: { timestamp: 'asc' },
  })

  console.log('Mensajes del asistente:', messages.length)
  console.log('\n=== MENSAJES TRUNCADOS ===')

  let truncated = 0
  for (const msg of messages) {
    const content = msg.content.trim()
    if (content.length < 50) continue

    // Detect truncation: ends without proper punctuation
    const endsClean = /[.!?:)\]"*\n]$/.test(content)

    if (!endsClean) {
      truncated++
      const session = sessions.find(s => s.id === msg.sessionId)
      const lesson = course.lessons.find(l => l.id === session?.lessonId)
      const last60 = content.slice(-60)
      console.log('---')
      console.log(`Sesion: ${msg.sessionId.slice(0, 8)} | ${session?.isTest ? 'TEST' : 'REAL'} | Estudiante: ${session?.user?.name}`)
      console.log(`Leccion: ${lesson?.title}`)
      console.log(`Tokens output: ${msg.outputTokens} | ${msg.timestamp.toISOString()}`)
      console.log(`Termina en: "...${last60}"`)
    }
  }

  console.log(`\nTotal truncados: ${truncated} de ${messages.length} mensajes`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
