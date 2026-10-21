import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearQuitadorDeCalificacionInicial, quitarCalificacionInicial } from '../lib/calificacion'

test('quita la calificación con que abre el mensaje y deja el resto intacto', () => {
  assert.equal(quitarCalificacionInicial('Exacto. Mencionas el vacío: eso es lo clave.'), 'Mencionas el vacío: eso es lo clave.')
  assert.equal(quitarCalificacionInicial('Bien pensado. Señalas los bordes.'), 'Señalas los bordes.')
  assert.equal(quitarCalificacionInicial('Bien, identificas el vacío.'), 'Identificas el vacío.')
  assert.equal(quitarCalificacionInicial('¡Excelente! Dices que hay fierro.'), 'Dices que hay fierro.')
  // En medio del mensaje no se toca; sin calificación, nada cambia
  assert.equal(quitarCalificacionInicial('Dices que hay fierro. Exacto, eso se ve.'), 'Dices que hay fierro. Exacto, eso se ve.')
  assert.equal(quitarCalificacionInicial('Mencionas el vacío.'), 'Mencionas el vacío.')
  // Solo la palabra no es un mensaje: se deja
  assert.equal(quitarCalificacionInicial('Exacto.'), 'Exacto.')
})

test('en streaming decide con la primera oración aunque llegue partida', () => {
  const q = crearQuitadorDeCalificacionInicial()
  const salida = ['Exa', 'cto. Menci', 'onas el vacío', '. Ahora vamos a la norma.'].map((t) => q.push(t)).join('') + q.flush()
  assert.equal(salida, 'Mencionas el vacío. Ahora vamos a la norma.')
  const q2 = crearQuitadorDeCalificacionInicial()
  assert.equal(['Dices que hay ', 'vacío debajo.'].map((t) => q2.push(t)).join('') + q2.flush(), 'Dices que hay vacío debajo.')
})
