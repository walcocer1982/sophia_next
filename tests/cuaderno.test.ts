import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparPorActividad, separarPedido } from '../lib/cuaderno'

const orden = ['a1', 'a2', 'a3']

test('agrupa por actividad en el orden de la lección; la bienvenida sin actividad va con lo que sigue', () => {
  const msgs = [
    { id: 'w', activityId: null },
    { id: 'u1', activityId: 'a1' },
    { id: 's1', activityId: 'a2' }, // transición: Sophia ya presenta la a2
    { id: 'u2', activityId: 'a2' },
  ]
  const g = agruparPorActividad(msgs, orden, 'a2')
  assert.deepEqual(g.map((s) => [s.actividadId, s.mensajes.map((m) => m.id)]), [['a1', ['w', 'u1']], ['a2', ['s1', 'u2']]])
})

test('sin ninguna actividad conocida, todo va a la actividad actual', () => {
  const g = agruparPorActividad([{ id: 'w', activityId: null }], orden, 'a3')
  assert.deepEqual(g.map((s) => s.actividadId), ['a3'])
})

test('separa el pedido final (pregunta o imperativo) del resto del mensaje', () => {
  assert.deepEqual(separarPedido('Bien, eso es correcto.\n\n¿Qué le pasa si falta otra vez?'), { cuerpo: 'Bien, eso es correcto.', pedido: '¿Qué le pasa si falta otra vez?' })
  assert.deepEqual(separarPedido('Exacto.\n\nBaja el TC2 a 0 y dime qué número ves.').pedido, 'Baja el TC2 a 0 y dime qué número ves.')
  assert.equal(separarPedido('Terminaste. Gracias por participar.').pedido, null)
})

test('en un párrafo largo destaca solo la oración final que pregunta (bienvenida del 14 oct)', () => {
  const r = separarPedido('Mira el caso de Luis. Luis terminó con 15 de promedio, pero figura con 00. Esta actividad no lleva nota. ¿Qué crees que pasó y qué dato del caso te lo dice?')
  assert.equal(r.pedido, '¿Qué crees que pasó y qué dato del caso te lo dice?')
  assert.equal(r.cuerpo, 'Mira el caso de Luis. Luis terminó con 15 de promedio, pero figura con 00. Esta actividad no lleva nota.')
  assert.equal(separarPedido('Bien. ¿Por qué esa? ¿Y qué pasa si falta otra vez?').pedido, '¿Por qué esa? ¿Y qué pasa si falta otra vez?')
})
