import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      contentJson: true
    }
  })

  for (const lesson of lessons) {
    console.log('\n' + '='.repeat(80))
    console.log('LESSON:', lesson.title)
    console.log('ID:', lesson.id)
    console.log('='.repeat(80))

    const content = lesson.contentJson as any
    if (!content) {
      console.log('No content')
      continue
    }

    // Mostrar estructura de actividades
    if (content.moments) {
      console.log('\nESTRUCTURA DE MOMENTOS Y ACTIVIDADES:')
      content.moments.forEach((moment: any, mi: number) => {
        console.log(`\n📍 MOMENTO ${mi + 1}: ${moment.title || 'Sin título'}`)

        if (moment.activities) {
          moment.activities.forEach((act: any, ai: number) => {
            console.log(`\n   📝 ACTIVIDAD ${act.id || `act-${ai}`}:`)
            console.log(`      Tipo: ${act.type}`)

            // Teaching instruction
            const instruction = act.teaching?.agent_instruction || act.agent_instruction || 'N/A'
            console.log(`      Instrucción: "${instruction.substring(0, 100)}..."`)

            // Verification question
            const question = act.verification?.question || 'N/A'
            console.log(`      Pregunta de verificación: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`)
          })
        }
      })
    } else if (content.activities) {
      // Estructura plana
      console.log('\nESTRUCTURA PLANA DE ACTIVIDADES:')
      content.activities.forEach((act: any, ai: number) => {
        console.log(`\n📝 ACTIVIDAD ${act.id || `act-${ai}`}:`)
        console.log(`   Tipo: ${act.type}`)

        const instruction = act.teaching?.agent_instruction || act.agent_instruction || 'N/A'
        console.log(`   Instrucción: "${instruction.substring(0, 100)}..."`)

        const question = act.verification?.question || 'N/A'
        console.log(`   Pregunta: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`)
      })
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
