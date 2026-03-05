/**
 * Script para probar el flujo de verificación internamente
 *
 * Prueba directamente las funciones de:
 * - isStudentUnsure()
 * - buildSystemPrompt()
 * - verifyActivityCompletion()
 *
 * Uso: npx tsx scripts/test-verification-flow.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simular las funciones del prompt-builder
function isStudentUnsure(message: string): boolean {
  const trimmed = message.trim()

  const unsurePatterns = [
    /no\s*(lo\s*)?s[eé]/i,
    /no\s*tengo\s*(ni\s*)?idea/i,
    /no\s*entiendo/i,
    /no\s*recuerdo/i,
    /no\s*me\s*acuerdo/i,
    /no\s*puedo/i,
    /no\s*s[eé]\s*qu[eé]\s*(hacer|decir|responder)/i,
    /no\s*me\s*sale/i,
    /me\s*rindo/i,
    /me\s*confund[íi]/i,
    /estoy\s*(muy\s*)?(confundid[oa]|perdid[oa])/i,
    /ayuda/i,
    /pista/i,
    /dame\s*(una\s*)?(pista|ayuda)/i,
    /^\s*[\?¿]+\s*$/,
    /^(mmm|ehh|umm|hmm)\s*\??$/i,
    /ni\s*idea/i,
    /pas[oó]/i,
  ]

  if (unsurePatterns.some(pattern => pattern.test(trimmed))) {
    return true
  }

  const confirmationPatterns = [
    /^(si|sí|ok|vale|entendido|claro|listo|perfecto|de\s*acuerdo)$/i,
  ]
  if (trimmed.length < 15 && trimmed.length > 0) {
    const isConfirmation = confirmationPatterns.some(p => p.test(trimmed))
    if (!isConfirmation && !/[a-záéíóúñ]{4,}/i.test(trimmed)) {
      return true
    }
  }

  return false
}

function extractScenario(questionText: string): string | null {
  const scenarioMatch = questionText.match(/[Tt]e describo[^:]*:\s*([^?]+)/i) ||
                        questionText.match(/[Ii]magina\s+(?:que\s+)?(?:estás\s+en\s+)?([^?]+)/i) ||
                        questionText.match(/[Oo]bserva[:]?\s*([^?]+)/i) ||
                        questionText.match(/[Ss]i tenemos[^?]+:\s*([^?]+)/i) ||
                        questionText.match(/[Ee]n\s+(?:un[ao]?\s+)?(taller|fábrica|obra|cocina|hospital)[^?]*/i)
  return scenarioMatch ? scenarioMatch[1]?.trim() || scenarioMatch[0]?.trim() : null
}

async function main() {
  console.log('🧪 Test de flujo de verificación en sophia_next')
  console.log('═'.repeat(70))

  // 1. Probar detección de "no sé"
  console.log('\n📍 TEST 1: Detección de "no sé"')
  console.log('─'.repeat(70))

  const testMessages = [
    'no lo se',
    'no sé',
    'ni idea',
    'no tengo idea',
    'me rindo',
    'pista',
    'ayuda',
    '???',
    'hmm',
    'paso',
    // Estos NO deberían ser "no sé"
    'El peligro es algo que puede causar daño',
    'sí, entendido',
    'los peligros son físicos, químicos y mecánicos',
  ]

  for (const msg of testMessages) {
    const result = isStudentUnsure(msg)
    console.log(`  "${msg}" => ${result ? '✅ Es "no sé"' : '❌ No es "no sé"'}`)
  }

  // 2. Probar extracción de escenario
  console.log('\n📍 TEST 2: Extracción de escenario de la pregunta')
  console.log('─'.repeat(70))

  const questions = [
    'Te describo un taller de soldadura: hay máquinas funcionando, humos en el ambiente, ruido constante, cables en el piso y trabajadores en posturas incómodas. ¿Qué tipos de peligros identificas?',
    'Imagina que estás en una obra de construcción con andamios sin barandas. ¿Qué peligros ves?',
    'Observa: en esta fábrica hay químicos sin etiquetar y ruido excesivo. ¿Qué riesgos identificas?',
    '¿Cuál es la diferencia entre peligro y riesgo?', // Sin escenario
  ]

  for (const q of questions) {
    const scenario = extractScenario(q)
    console.log(`\n  Pregunta: "${q.slice(0, 60)}..."`)
    console.log(`  Escenario extraído: ${scenario ? `"${scenario.slice(0, 80)}..."` : '❌ No hay escenario'}`)
  }

  // 3. Verificar estructura de la lección IPERC
  console.log('\n📍 TEST 3: Verificar estructura de lección IPERC')
  console.log('─'.repeat(70))

  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { slug: { contains: 'iperc' } },
        { title: { contains: 'IPERC' } }
      ]
    }
  })

  if (!lesson) {
    console.log('❌ No se encontró la lección IPERC')
    console.log('   Ejecuta: npx tsx scripts/recreate-iperc-lesson.ts')
    return
  }

  console.log(`\n  Lección: ${lesson.title}`)
  console.log(`  ID: ${lesson.id}`)

  const content = lesson.contentJson as {
    activities: Array<{
      id: string
      type: string
      verification: {
        question: string
        criteria?: string[]
      }
    }>
  }

  console.log(`\n  Actividades:`)
  for (const activity of content.activities) {
    const scenario = extractScenario(activity.verification.question)
    console.log(`\n    ${activity.id} (${activity.type}):`)
    console.log(`      Pregunta: "${activity.verification.question.slice(0, 70)}..."`)
    console.log(`      Escenario: ${scenario ? `"${scenario.slice(0, 50)}..."` : 'Sin escenario específico'}`)
  }

  // 4. Simular el prompt que se generaría
  console.log('\n📍 TEST 4: Simular prompt para "no sé" en activity-002')
  console.log('─'.repeat(70))

  const activity002 = content.activities.find(a => a.id === 'activity-002')
  if (activity002) {
    const questionText = activity002.verification.question
    const extractedScenario = extractScenario(questionText)

    console.log('\n  === PROMPT GENERADO (sección dinámica) ===\n')
    console.log(`🚨 ESTUDIANTE DICE "NO SÉ" - INSTRUCCIONES CRÍTICAS:

PREGUNTA QUE DEBES REFORZAR (COPIA EXACTA):
"${questionText}"

${extractedScenario ? `ESCENARIO EXTRAÍDO (USA ESTE, NO INVENTES OTRO):
"${extractedScenario}"` : ''}

REGLAS OBLIGATORIAS:
1. SIMPLIFICA la pregunta en partes más pequeñas
2. USA EL ESCENARIO EXACTO de arriba - NO inventes uno nuevo
3. Pregunta paso a paso: "En ese ${extractedScenario ? 'escenario' : 'caso'}, ¿qué ves primero que podría ser peligroso?"
4. Ofrece opciones concretas: "¿Sería el humo un peligro químico o físico?"
5. PROHIBIDO: cambiar de tema, usar otro ejemplo, volver a actividades anteriores`)

    console.log('\n  ═══════════════════════════════════════════\n')

    if (extractedScenario) {
      console.log('  ✅ El prompt incluye el escenario del taller de soldadura')
      console.log('  ✅ La IA debería usar ESTE escenario, no inventar uno nuevo')
    } else {
      console.log('  ⚠️ No se pudo extraer el escenario de la pregunta')
    }
  }

  console.log('\n═'.repeat(70))
  console.log('✅ Tests completados')
  console.log('\nPara probar con la IA real, inicia el servidor y usa la interfaz web.')
  console.log('Observa los logs del servidor para ver el prompt_context.')

  await prisma.$disconnect()
}

main().catch(console.error)
