import { test } from 'node:test'
import assert from 'node:assert/strict'
import { revisarPedidos, avisosDePedidos } from '../lib/planner/pedidos'

test('marca las preguntas de EVA-NOTA v4 que pedían dos cosas', () => {
  // Actividad 7: decidir y reescribir.
  assert.ok(revisarPedidos('¿Qué criterio subirías primero y por qué? Y reescribe esta oración del trabajo para que llegue a Destacado: «La faja transportadora falló porque estaba en mal estado».'))
  // Actividad 2: el porqué y un caso nuevo.
  assert.ok(revisarPedidos('¿Por qué esa? Y dime qué le pasa a Mario si vuelve a faltar la próxima semana, aunque tenga certificado.'))
  // Actividad 5: el porqué y dos hipótesis.
  assert.ok(revisarPedidos('¿Por qué esa? Explica qué pasa con la nota si no entrega y qué pasa si copia.'))
  // Actividad 6: dos preguntas.
  assert.ok(revisarPedidos('¿Cuál de las dos decisiones te hace desaprobar y por qué? ¿Y qué harías para que el EF no quede abandonado?'))
})

test('no marca un pedido único: decisión con su porqué, predicción, reescritura sola', () => {
  assert.equal(revisarPedidos('¿Qué criterio subirías primero para la segunda entrega y por qué?'), null)
  assert.equal(revisarPedidos('Mario ya justificó esta falta. Si vuelve a faltar la próxima semana, aunque tenga certificado, ¿qué le pasa?'), null)
  assert.equal(revisarPedidos('Reescribe esta oración del trabajo para que el Desarrollo técnico llegue a Destacado: «La faja transportadora falló porque estaba en mal estado».'), null)
  assert.equal(revisarPedidos('¿Por qué esa y no las otras?'), null)
  assert.equal(revisarPedidos('Para el día que tengas que faltar: ¿a quién le avisas y por dónde, y cómo y hasta cuándo justificas?'), null)
  assert.equal(revisarPedidos(''), null)
})

test('no marca la decisión con su porqué, los ejemplos ni el «si no sabes…» (auditoría del 13 oct)', () => {
  assert.equal(revisarPedidos('Si los trabajadores se quitan su equipo específico y solo usan los EPPs básicos, ¿podrían hacer su tarea? ¿Por qué no?'), null)
  assert.equal(revisarPedidos('Lee lo que escribió Renzo. ¿Su conclusión se sostiene con lo que él mismo da como prueba? Explícame por qué sí o por qué no.'), null)
  assert.equal(revisarPedidos('Del 1 al 10, ¿qué tan listo te sientes para el próximo curso? ¿Por qué ese número y no uno menos?'), null)
  assert.equal(revisarPedidos('Mirando tu nota del TC: ¿en qué criterio crees que perdiste más puntos y por qué? Por ejemplo: copia literal del manual, conclusiones genéricas.'), null)
  assert.equal(revisarPedidos('Cuéntame del TC que cerraste: ¿de qué tema era y qué nota obtuviste? Si no recuerdas o es tu primer curso, dímelo y trabajamos con un ejemplo.'), null)
  assert.equal(revisarPedidos('El próximo curso dura una semana. Diseña tu plan partiendo de tu última semana: ¿qué vas a hacer distinto día por día?'), null)
})

test('sí marca calcular y además explicar otra cosa en otra oración', () => {
  assert.ok(revisarPedidos('Una planta requiere 200 kg de zinc por día. Calcula la corriente teórica y la real. ¿Qué factores causan la diferencia?'))
  assert.ok(revisarPedidos('En la última semana: ¿cuándo estudiaste de verdad? ¿Llegaste a dormir bien antes del examen?'))
})

test('lo citado entre comillas no cuenta como pedido', () => {
  assert.equal(revisarPedidos('¿Qué le falta a esta oración: «Calcula y escribe el resultado»?'), null)
})

test('avisosDePedidos revisa pregunta, apertura y paso cerrado de cada actividad', () => {
  const avisos = avisosDePedidos([
    { id: 'a1', verification: { question: '¿Qué hace? ¿Y qué haría la semana siguiente?' } },
    { id: 'a2', verification: { question: '¿Qué hace y por qué?' }, teaching: { first_question: '¿Qué crees que pasa?' } },
  ])
  assert.deepEqual(avisos.map((a) => [a.activityId, a.campo]), [['a1', 'verification.question']])
})
