import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeInstructorMessage } from '../lib/message-summarizer'

// Prueba por API del 22 oct 2026 (EOM-SOST S1, actividad de pernos): el resumen del mensaje de
// Sophia ponía el ejemplo como «ESCENARIO» y de la pregunta dejaba solo «¿Qué perno es, y por qué?».
const BIENVENIDA = `Hola, soy Sophia, tu instructora para esta lección sobre sostenimiento activo en minería subterránea. Hoy vamos a distinguir cómo funcionan los métodos de refuerzo que se usan en las labores.

Empecemos con lo primero: un perno se reconoce por la forma en que ancla. Mira la lámina «Detalle del perno helicoidal» en la pizarra. Hay tres formas diferentes: el split set ancla por fricción; el perno helicoidal usa resina o cemento; y el hydrabolt ancla por expansión. Te doy un ejemplo: en la rampa 2 el perforista llena un tubo cerrado con agua a presión y se hincha contra el taladro, eso es hydrabolt, ancla por expansión.

Ahora tú: en la labor encuentras un tubo ranurado que el ayudante mete a golpes dentro del taladro, sin resina ni agua. ¿Qué perno es, y por qué?`

test('la pregunta conserva la situación que la plantea', () => {
  const r = summarizeInstructorMessage(BIENVENIDA)
  assert.match(r, /PREGUNTA: "Ahora tú: en la labor encuentras un tubo ranurado que el ayudante mete a golpes dentro del taladro, sin resina ni agua\. ¿Qué perno es, y por qué\?"/)
})

test('el ejemplo resuelto no se presenta como el escenario de la pregunta', () => {
  const r = summarizeInstructorMessage(BIENVENIDA)
  assert.doesNotMatch(r, /ESCENARIO: "ejemplo/i)
  assert.match(r, /EJEMPLO YA RESUELTO POR EL INSTRUCTOR \(no es lo que se pregunta\)/)
})
