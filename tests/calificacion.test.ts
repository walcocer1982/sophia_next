import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearQuitadorDeCalificaciones, quitarCalificacionInicial, quitarCalificaciones } from '../lib/calificacion'

const enTrozos = (texto: string, paso: number) => {
  const q = crearQuitadorDeCalificaciones()
  let salida = ''
  for (let i = 0; i < texto.length; i += paso) salida += q.push(texto.slice(i, i + paso))
  return salida + q.flush()
}

test('quita la calificación con que abre el mensaje y deja el resto intacto', () => {
  assert.equal(quitarCalificacionInicial('Exacto. Mencionas el vacío: eso es lo clave.'), 'Mencionas el vacío: eso es lo clave.')
  assert.equal(quitarCalificacionInicial('Bien pensado. Señalas los bordes.'), 'Señalas los bordes.')
  assert.equal(quitarCalificacionInicial('Bien, identificas el vacío.'), 'Identificas el vacío.')
  assert.equal(quitarCalificacionInicial('¡Excelente! Dices que hay fierro.'), 'Dices que hay fierro.')
  assert.equal(quitarCalificacionInicial('Mencionas el vacío.'), 'Mencionas el vacío.')
  // Solo la palabra no es un mensaje: se deja
  assert.equal(quitarCalificacionInicial('Exacto.'), 'Exacto.')
})

test('simulaciones del 21 oct: también al final y a mitad del mensaje', () => {
  assert.equal(
    quitarCalificaciones('Dices que están armando la losa y el perímetro está cercado. Bien observado.\n\nAhora miremos el segundo paso.'),
    'Dices que están armando la losa y el perímetro está cercado.\n\nAhora miremos el segundo paso.',
  )
  assert.equal(quitarCalificaciones('Dices que hay trabajadores sobre la losa. Bien, eso es lo que ves.'), 'Dices que hay trabajadores sobre la losa. Eso es lo que ves.')
  assert.equal(quitarCalificaciones('Dices que hay fierro. Exacto, eso se ve.'), 'Dices que hay fierro. Eso se ve.')
  // «Eso es lo que buscamos» no es una calificación: sin puntuación tras «eso es»
  assert.equal(quitarCalificaciones('Eso es lo que buscamos ver.'), 'Eso es lo que buscamos ver.')
  assert.equal(quitarCalificaciones('Bien hecho el recorrido.'), 'Bien hecho el recorrido.')
  assert.equal(quitarCalificaciones('Exacto.'), 'Exacto.')
})

test('en streaming da lo mismo que de una vez, se corte donde se corte', () => {
  const texto = 'Exacto: señalas el perímetro de la losa como punto de caída. Bien observado. Ahora vamos a la norma. Muy bien.'
  const esperado = 'Señalas el perímetro de la losa como punto de caída. Ahora vamos a la norma.'
  for (const paso of [1, 2, 3, 6, 13, 200]) assert.equal(enTrozos(texto, paso), esperado, `trozos de ${paso}`)
})

test('prueba de Edwin (21 oct): «Exacto:» llega solo en un trozo y se quita igual', () => {
  const q = crearQuitadorDeCalificaciones()
  const trozos = ['Exacto', ':', ' señalas el perímetro de la losa', ' como punto de caída.']
  assert.equal(trozos.map((t) => q.push(t)).join('') + q.flush(), 'Señalas el perímetro de la losa como punto de caída.')
  const q2 = crearQuitadorDeCalificaciones()
  assert.equal(['Exacto.'].map((t) => q2.push(t)).join('') + q2.flush(), 'Exacto.')
})

test('simulaciones del 22 oct: «Eso es una buena observación:» y «Exacto lo que…» en la rutina', () => {
  assert.equal(
    quitarCalificaciones('Eso es una buena observación: alguien tuvo que verificar que aguanta. Hay normas detrás.'),
    'Alguien tuvo que verificar que aguanta. Hay normas detrás.',
  )
  assert.equal(
    quitarCalificaciones('Dices que los pernos rodean la excavación. Exacto lo que muestra la figura.\n\nAhora el segundo paso.'),
    'Dices que los pernos rodean la excavación.\n\nAhora el segundo paso.',
  )
})

test('simulación PM-FMPLANTA S1 (22 oct): «Excelente pregunta.» en el Me pregunto', () => {
  assert.equal(
    quitarCalificaciones('Excelente pregunta. Eso que planteas lo vamos a distinguir hoy.'),
    'Eso que planteas lo vamos a distinguir hoy.',
  )
})
