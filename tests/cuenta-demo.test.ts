import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esNombreDeSeccionDemo } from '../lib/cuenta-demo'

test('una sección de demostración se reconoce por el nombre', () => {
  assert.equal(esNombreDeSeccionDemo('Demo marketing'), true)
  assert.equal(esNombreDeSeccionDemo('  demo feria'), true)
  assert.equal(esNombreDeSeccionDemo('SI A'), false)
  assert.equal(esNombreDeSeccionDemo('Práctica (simulados)'), false)
})
