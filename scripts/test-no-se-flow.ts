/**
 * Script para probar el flujo cuando el estudiante dice "no sé"
 *
 * Este script:
 * 1. Crea una sesión de prueba
 * 2. Simula respuestas del estudiante
 * 3. Muestra las respuestas de la IA para verificar que no regresa a temas anteriores
 *
 * Uso: npx tsx scripts/test-no-se-flow.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

interface StreamEvent {
  type: string
  text?: string
  content?: string
  error?: string
}

async function sendMessage(sessionId: string, message: string): Promise<string> {
  console.log(`\n📤 Enviando: "${message}"`)
  console.log('─'.repeat(60))

  const response = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=test-session' // Mock auth
    },
    body: JSON.stringify({ sessionId, message })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  // Procesar SSE stream
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader')

  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data: StreamEvent = JSON.parse(line.slice(6))

          if (data.type === 'content' && data.text) {
            process.stdout.write(data.text)
            fullResponse += data.text
          } else if (data.type === 'chunk' && data.content) {
            process.stdout.write(data.content)
            fullResponse += data.content
          } else if (data.type === 'done') {
            console.log('\n')
          } else if (data.type === 'error') {
            console.error(`\n❌ Error: ${data.error}`)
          } else if (data.type === 'activity_completed') {
            console.log(`\n✅ Actividad completada!`)
          } else if (data.type === 'max_attempts_reached') {
            console.log(`\n⚠️ Máximo de intentos alcanzado`)
          }
        } catch {
          // Ignorar líneas que no son JSON válido
        }
      }
    }
  }

  return fullResponse
}

async function main() {
  console.log('🧪 Test de flujo "no sé" en sophia_next')
  console.log('═'.repeat(60))

  // 1. Buscar usuario de prueba o crear uno
  let user = await prisma.user.findFirst({
    where: { email: 'test@test.com' }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        name: 'Usuario de Prueba'
      }
    })
    console.log('✅ Usuario de prueba creado')
  }

  // 2. Buscar lección IPERC
  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { slug: { contains: 'iperc' } },
        { title: { contains: 'IPERC' } }
      ]
    }
  })

  if (!lesson) {
    console.error('❌ No se encontró la lección IPERC')
    console.log('Ejecuta primero: npx tsx scripts/recreate-iperc-lesson.ts')
    return
  }

  console.log(`📚 Lección: ${lesson.title}`)

  // 3. Crear nueva sesión de prueba
  const session = await prisma.lessonSession.create({
    data: {
      userId: user.id,
      lessonId: lesson.id,
      activityId: 'activity-001', // Primera actividad
      progress: 0,
    }
  })

  console.log(`🎯 Sesión creada: ${session.id}`)
  console.log('═'.repeat(60))

  try {
    // 4. Simular flujo de conversación

    console.log('\n📍 PASO 1: Responder correctamente a activity-001 (peligro vs riesgo)')
    console.log('─'.repeat(60))

    // Primera respuesta correcta para pasar a activity-002
    const response1 = await sendMessage(session.id,
      'El peligro es algo que puede causar daño, como un cable pelado. El riesgo es la probabilidad de que ese daño ocurra. Por ejemplo, si el cable está en un lugar donde pasa mucha gente, el riesgo es alto.'
    )

    // Verificar si avanzó
    const sessionAfter1 = await prisma.lessonSession.findUnique({
      where: { id: session.id },
      select: { activityId: true }
    })
    console.log(`\n📊 ActivityId después de respuesta 1: ${sessionAfter1?.activityId}`)

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n📍 PASO 2: Decir "no lo sé" en activity-002 (tipos de peligros)')
    console.log('─'.repeat(60))

    // Ahora decir "no lo sé" en la segunda actividad
    const response2 = await sendMessage(session.id, 'no lo se')

    // Analizar la respuesta
    console.log('\n📊 ANÁLISIS DE LA RESPUESTA:')
    console.log('─'.repeat(60))

    const hasWeldingKeywords =
      response2.toLowerCase().includes('soldadura') ||
      response2.toLowerCase().includes('taller') ||
      response2.toLowerCase().includes('humo') ||
      response2.toLowerCase().includes('máquina')

    const hasOldTopicKeywords =
      response2.toLowerCase().includes('diferencia entre peligro y riesgo') ||
      response2.toLowerCase().includes('qué es un peligro')

    const introducedNewScenario =
      response2.toLowerCase().includes('cable pelado') ||
      response2.toLowerCase().includes('cocina') ||
      response2.toLowerCase().includes('otro ejemplo')

    if (hasWeldingKeywords && !hasOldTopicKeywords && !introducedNewScenario) {
      console.log('✅ CORRECTO: La IA usa el escenario del taller de soldadura')
    } else if (hasOldTopicKeywords) {
      console.log('❌ ERROR: La IA regresó al tema anterior (peligro vs riesgo)')
    } else if (introducedNewScenario) {
      console.log('⚠️ PROBLEMA: La IA inventó un nuevo escenario en lugar de usar el taller')
    } else {
      console.log('⚠️ REVISAR: No se detectaron keywords esperados')
    }

    console.log('\n📝 Keywords detectados:')
    console.log(`  - Taller/soldadura/humo: ${hasWeldingKeywords ? '✅' : '❌'}`)
    console.log(`  - Tema anterior (peligro vs riesgo): ${hasOldTopicKeywords ? '❌ (malo)' : '✅ (bien)'}`)
    console.log(`  - Escenario nuevo inventado: ${introducedNewScenario ? '❌ (malo)' : '✅ (bien)'}`)

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error)
  } finally {
    // Limpiar sesión de prueba
    console.log('\n🧹 Limpiando sesión de prueba...')
    await prisma.message.deleteMany({ where: { sessionId: session.id } })
    await prisma.activityProgress.deleteMany({ where: { lessonSessionId: session.id } })
    await prisma.lessonSession.delete({ where: { id: session.id } })
    console.log('✅ Sesión eliminada')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
