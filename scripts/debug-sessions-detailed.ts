import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar sesiones con más mensajes
  const sessions = await prisma.lessonSession.findMany({
    take: 10,
    orderBy: { lastActivityAt: 'desc' },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      },
      lesson: {
        select: { title: true }
      },
      activities: {
        orderBy: { startedAt: 'desc' }
      }
    }
  })

  // Filtrar sesiones con más de 8 mensajes
  const richSessions = sessions.filter(s => s.messages.length >= 8)

  console.log(`\nEncontradas ${richSessions.length} sesiones con 8+ mensajes\n`)

  for (const session of richSessions) {
    console.log('\n' + '='.repeat(100))
    console.log('SESSION:', session.id)
    console.log('LESSON:', session.lesson?.title)
    console.log('CURRENT ACTIVITY ID:', session.activityId)
    console.log('TOTAL MESSAGES:', session.messages.length)
    console.log('='.repeat(100))

    // Mostrar actividades y sus intentos
    console.log('\nACTIVITY PROGRESS:')
    for (const act of session.activities) {
      const evidence = act.evidenceData as { attempts?: Array<{ studentResponse: string }> } | null
      console.log(`  - ${act.activityId}: ${act.status} (${act.attempts} attempts)`)
      if (evidence?.attempts) {
        evidence.attempts.forEach((a, i) => {
          console.log(`      Intento ${i+1}: "${a.studentResponse?.substring(0, 50)}..."`)
        })
      }
    }

    console.log('\nFLUJO DE PREGUNTAS DEL INSTRUCTOR:')
    console.log('-'.repeat(100))

    // Analizar flujo de preguntas
    let lastActivityId = ''
    session.messages.forEach((m, i) => {
      if (m.role === 'assistant') {
        // Detectar si cambió de actividad
        const activityChanged = m.activityId !== lastActivityId
        if (activityChanged && lastActivityId !== '') {
          console.log(`\n  ⚡ CAMBIO DE ACTIVIDAD: ${lastActivityId} → ${m.activityId}`)
        }
        lastActivityId = m.activityId || ''

        // Buscar preguntas en el mensaje
        const questions = m.content.match(/[^.!?]*\?/g) || []
        const lastQuestion = questions[questions.length - 1]

        // Detectar tipo de contenido
        const isPeligroRiesgo = m.content.toLowerCase().includes('peligro') && m.content.toLowerCase().includes('riesgo')
        const isTipos = m.content.toLowerCase().includes('tipo') && m.content.toLowerCase().includes('peligro')
        const isMatriz = m.content.toLowerCase().includes('matriz') || m.content.toLowerCase().includes('probabilidad')
        const isControl = m.content.toLowerCase().includes('control') || m.content.toLowerCase().includes('elimina')

        let tema = '???'
        if (isPeligroRiesgo && !isTipos) tema = 'PELIGRO vs RIESGO'
        else if (isTipos) tema = 'TIPOS DE PELIGROS'
        else if (isMatriz) tema = 'MATRIZ EVALUACIÓN'
        else if (isControl) tema = 'CONTROLES'

        console.log(`\n[${i+1}] INSTRUCTOR (${m.activityId || 'N/A'}) - Tema: ${tema}`)
        if (lastQuestion) {
          console.log(`    Pregunta: "${lastQuestion.trim().substring(0, 100)}${lastQuestion.length > 100 ? '...' : ''}"`)
        }
      } else {
        console.log(`[${i+1}] ESTUDIANTE: "${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}"`)
      }
    })
  }

  // Si no hay sesiones con 8+ mensajes, mostrar todas
  if (richSessions.length === 0) {
    console.log('No hay sesiones con 8+ mensajes. Mostrando todas:')
    for (const session of sessions) {
      console.log(`\n- ${session.id}: ${session.messages.length} mensajes (${session.lesson?.title})`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
