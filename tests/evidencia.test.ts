import { test } from 'node:test'
import assert from 'node:assert/strict'
import { descartarSinEvidencia } from '../lib/activity-verification'

const criterios = [
  'Da un número máximo de faltas para su curso actual',
  'Nombra una acción concreta si falta: avisar, justificar o recuperar',
]

test('descarta el criterio cuya cita no está en lo que escribió el alumno', () => {
  // Caso real de EVA-NOTA: el alumno solo dio el número, el verificador marcó también la acción.
  const r = {
    criteriaMatched: [1, 2],
    criteriaMissing: [],
    evidence: { '1': 'puedo faltar 3', '2': 'le aviso al instructor' },
  }
  const n = descartarSinEvidencia(r, criterios, ['de lunes a viernes, serian 10 y puedo faltar 3'])
  assert.equal(n, 1)
  assert.deepEqual(r.criteriaMatched, [1])
  assert.deepEqual(r.criteriaMissing, [2])
})

test('conserva el criterio con cita literal, sin importar tildes ni mayúsculas', () => {
  const r = { criteriaMatched: [2], criteriaMissing: [], evidence: { '2': 'le aviso al instructor' } }
  const n = descartarSinEvidencia(r, criterios, ['3 faltas, y si falto LE AVISO al Instructor'])
  assert.equal(n, 0)
  assert.deepEqual(r.criteriaMatched, [2])
})

test('descarta el criterio que viene sin cita', () => {
  const r = { criteriaMatched: [1, 2], criteriaMissing: [], evidence: { '1': 'la b' } }
  const n = descartarSinEvidencia(r, ['Elige una de las tres opciones', 'Da una razón de su elección'], ['la b'])
  assert.equal(n, 1)
  assert.deepEqual(r.criteriaMatched, [1])
})

test('acepta un criterio dicho en partes, en dos mensajes, con una cita por parte', () => {
  // Prueba del 12 oct: «estaria en amarillo» y luego «una fla mas y deaprueba».
  const regla = ['Explica el procedimiento', 'Sabe que justificar no anula la falta: queda en amarillo y con la siguiente desaprueba']
  const alumno = ['estaria en el 20% estaria en amarillo', 'una fla mas y deaprueba']
  const enLista = { criteriaMatched: [2], criteriaMissing: [], evidence: { '2': ['estaria en amarillo', 'una fla mas y deaprueba'] } }
  assert.equal(descartarSinEvidencia(enLista, regla, alumno), 0)
  assert.deepEqual(enLista.criteriaMatched, [2])
  const conBarra = { criteriaMatched: [2], criteriaMissing: [], evidence: { '2': 'estaria en amarillo | una fla mas y deaprueba' } }
  assert.equal(descartarSinEvidencia(conBarra, regla, alumno), 0)
})

test('descarta el criterio en partes si una de las partes no la dijo el alumno', () => {
  const regla = ['Procedimiento', 'Justificar no anula la falta']
  const r = { criteriaMatched: [2], criteriaMissing: [], evidence: { '2': ['estaria en amarillo', 'el certificado no borra la falta'] } }
  assert.equal(descartarSinEvidencia(r, regla, ['estaria en el 20% estaria en amarillo']), 1)
  assert.deepEqual(r.criteriaMissing, [2])
})

test('si el modelo no manda evidence, no descarta nada', () => {
  const r = { criteriaMatched: [1], criteriaMissing: [] }
  assert.equal(descartarSinEvidencia(r, criterios, ['algo']), 0)
  assert.deepEqual(r.criteriaMatched, [1])
})
