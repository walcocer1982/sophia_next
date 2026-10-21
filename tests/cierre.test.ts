import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumenDeCierre } from '../lib/cierre'

test('simulaciones del 21 oct: el resumen del cierre son los puntos clave literales', () => {
  const r = resumenDeCierre(['Cuándo una tarea es trabajo en altura', 'Peligros de caída: bordes, aberturas y techos', ' Caída de personas y caída de objetos '])
  assert.equal(r, 'Hoy trabajamos:\n- Cuándo una tarea es trabajo en altura\n- Peligros de caída: bordes, aberturas y techos\n- Caída de personas y caída de objetos\n\nGracias por participar.')
  assert.ok(!r.includes('?'))
})
