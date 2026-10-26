import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esDni, nombresCoinciden, palabrasDelNombre } from '../lib/cuenta-duplicada'

test('palabras del nombre: sin tildes, sin orden, sin «de/del»', () => {
  assert.deepEqual([...palabrasDelNombre('Pérez Rivera Rosario Del Pilar')], ['perez', 'rivera', 'rosario', 'pilar'])
})

test('misma persona aunque Google dé el nombre en otro orden (casos del 26 oct)', () => {
  assert.equal(nombresCoinciden('Zayda Cuellar Flores', 'Cuellar Flores Zayda Sarita'), true)
  assert.equal(nombresCoinciden('Antonio Tito', 'Challhua Tito Luis Antonio'), true)
  assert.equal(nombresCoinciden('Froilán Flores Vargas', 'Flores Vargas Yawar Inti Froilan'), true)
})

test('una sola palabra en común no alcanza', () => {
  assert.equal(nombresCoinciden('Mili Monroy', 'Monroy Huamaní Milagros Lizeth'), false)
  assert.equal(nombresCoinciden('Juan Quispe', 'Quispe Mamani Rosa'), false)
  assert.equal(nombresCoinciden(null, 'Quispe Mamani Rosa'), false)
})

test('DNI: 8 dígitos', () => {
  assert.equal(esDni('62013578'), true)
  assert.equal(esDni(' 62013578 '), true)
  assert.equal(esDni('6201357'), false)
  assert.equal(esDni('6201357a'), false)
})
