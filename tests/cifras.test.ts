import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contradiceCifras, descartarCifrasContradichas, valoresConUnidad } from '../lib/cifras'

const criterio = 'Decide que sí: en industria general la norma exige protección desde 1,20 m, y 1,50 m lo supera'
const dados = 'Un operario trabaja desde un entrepiso a 1,50 m del piso. ¿Está en trabajo en altura, y por qué?'

test('valores con unidad: misma cifra escrita distinto; sin unidad no cuenta', () => {
  assert.deepEqual(valoresConUnidad('desde 1,20 m o 1.2 metros'), [{ n: 1.2, unidad: 'm', decimales: 2 }, { n: 1.2, unidad: 'm', decimales: 1 }])
  assert.deepEqual(valoresConUnidad('la norma 1910, art. 134, del año 2016'), [])
  assert.deepEqual(valoresConUnidad('una baranda de 60 cm y un 25 %'), [{ n: 60, unidad: 'cm', decimales: 0 }, { n: 25, unidad: '%', decimales: 0 }])
})

test('dictado del navegador: «1 m 80» es 1,80 m (prueba de Edwin, 21 oct)', () => {
  assert.deepEqual(valoresConUnidad('ahí aplicaría 1 m 80 y en industria 1 m 20 que es'), [{ n: 1.8, unidad: 'm', decimales: 2 }, { n: 1.2, unidad: 'm', decimales: 2 }])
  const crit = 'Decide: en la embotelladora sí (OSHA 1910, industria general, desde 1,20 m) y en la mina no por umbral (D.S. 024, desde 1,80 m)'
  const alumno = ['en la planta concentradora de minerales, ahí aplicaría 1 m 80 porque está el Decreto Supremo cero 24 y en la planta embotelladora sería la zona industrial 1 m 20 que es la olla 19 10.28.']
  assert.equal(contradiceCifras(crit, alumno, 'La misma plataforma de 1,60 m en dos lugares'), false)
  assert.deepEqual(valoresConUnidad('una baranda de 1 m 5 cm'), [{ n: 1, unidad: 'm', decimales: 0 }, { n: 5, unidad: 'cm', decimales: 0 }])
})

test('simulación «apurado» del 21 oct: decide bien con un umbral falso → no cubre', () => {
  const alumno = [
    'ok, en industria general es desde 1,80 m. Entonces no está en trabajo en altura',
    'ya, dice 1,50 m entonces. Entonces sí está en trabajo en altura porque llega exacto a 1,50 m.',
  ]
  assert.equal(contradiceCifras(criterio, alumno, dados), true)
})

test('dice el valor del criterio, aunque antes se equivocó → cubre', () => {
  assert.equal(contradiceCifras(criterio, ['es desde 1,80 m', 'no, perdón: desde 1,2 m, y 1,50 m lo supera'], dados), false)
})

test('sin cifras, o solo con las de la pregunta → lo juzga el verificador', () => {
  assert.equal(contradiceCifras(criterio, ['sí, porque en una planta el límite es más bajo que en obra'], dados), false)
  assert.equal(contradiceCifras(criterio, ['sí, a 1,50 m ya cuenta'], dados), false)
  assert.equal(contradiceCifras('La baranda debe tener al menos 1,0 m', ['no llega a metro, pues'], 'baranda de 60 cm'), false)
  assert.equal(contradiceCifras('Nombra el peligro: el borde sin baranda', ['dice 9 m'], dados), false)
})

test('otras unidades del alumno no se comparan con el umbral', () => {
  assert.equal(contradiceCifras(criterio, ['trabajé 5 años en planta; sí, porque supera el límite de industria'], dados), false)
})

test('descartar mueve el criterio a «faltan» (números 1-based)', () => {
  const r = { criteriaMatched: [1, 2], criteriaMissing: [] as unknown[] }
  const n = descartarCifrasContradichas(r, [criterio, 'Nombra el borde sin baranda'], ['es desde 1,80 m, sí está'], dados)
  assert.equal(n, 1)
  assert.deepEqual(r.criteriaMatched, [2])
  assert.deepEqual(r.criteriaMissing, [1])
})

test('redondeo a la precisión del criterio: «94,7 %» es «95 %» (prueba de Christian, 26 oct)', () => {
  const criterio = 'Decide que no le sobra: trabaja al 95 % (71 A de 75 A)'
  const dados = 'Corriente nominal 75 A; la pinza mide 71 A'
  assert.equal(contradiceCifras(criterio, ['el motor está trabajando al 94.7 % de su capacidad nominal'], dados), false)
  assert.equal(contradiceCifras(criterio, ['trabaja al 94,7 %'], dados), false)
  assert.equal(contradiceCifras(criterio, ['trabaja al 90 %'], dados), true)
  // Con decimales en el criterio, el redondeo no rescata un valor distinto.
  assert.equal(contradiceCifras('Decide: en la embotelladora sí, desde 1,20 m', ['desde 1,25 m'], ''), true)
  assert.equal(contradiceCifras('Decide: en la embotelladora sí, desde 1,20 m', ['desde 1.2 m'], ''), false)
  assert.equal(contradiceCifras('Decide que sí: desde 1,80 m', ['dice 1,50 m'], ''), true)
})
