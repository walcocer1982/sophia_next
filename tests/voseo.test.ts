import { test } from 'node:test'
import assert from 'node:assert/strict'
import { corregirVoseo, crearCorrectorDeVoseo } from '../lib/voseo'

test('corrige el voseo y respeta la mayúscula', () => {
  assert.equal(corregirVoseo('Mirá el caso de Luis en el material.'), 'Mira el caso de Luis en el material.')
  assert.equal(corregirVoseo('Si tenés dudas, decime y fijate en la tabla.'), 'Si tienes dudas, dime y fíjate en la tabla.')
  assert.equal(corregirVoseo('¿Vos qué creés?'), '¿Tú qué crees?')
})

test('no toca el tuteo ni palabras que se parecen', () => {
  const tuteo = 'Mira la tabla, fíjate en la fila y dime qué ves. Estás cerca. Los vosotros no aplican.'
  assert.equal(corregirVoseo(tuteo), tuteo)
  assert.equal(corregirVoseo('Las cosas y los casos.'), 'Las cosas y los casos.')
})

test('en streaming corrige aunque la palabra llegue partida', () => {
  const c = crearCorrectorDeVoseo()
  const salida = [c.push('Hola. Mir'), c.push('á el caso y'), c.push(' decime qué ves'), c.flush()].join('')
  assert.equal(salida, 'Hola. Mira el caso y dime qué ves')
})
