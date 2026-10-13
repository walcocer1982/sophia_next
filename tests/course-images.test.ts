import { test } from 'node:test'
import assert from 'node:assert/strict'
import { faltaParaValidar, usosPorImagen } from '../lib/course-images'

test('para validar hace falta descripción, licencia real y fuente', () => {
  const lista = { description: 'Trabajador con casco en la planta de chancado', license: 'Foto propia CETEMIN', source: 'Planta piloto' }
  assert.deepEqual(faltaParaValidar(lista, true), [])
  assert.equal(faltaParaValidar({ ...lista, license: 'Generada con IA' }, true).length, 1)
  assert.equal(faltaParaValidar({ ...lista, source: '' }, true).length, 1)
  assert.equal(faltaParaValidar({ ...lista, description: 'casco' }, true).length, 1)
})

test('«sin registrar» no alcanza para validar, pero se tolera al editar una vieja', () => {
  const vieja = { description: 'Imagen vieja de la lección de EPP', license: 'sin registrar', source: 'sin registrar' }
  assert.equal(faltaParaValidar(vieja, true).length, 2)
  assert.deepEqual(faltaParaValidar(vieja), [])
})

test('los usos se cuentan por bankId o por la misma url, una vez por lección', () => {
  const banco = [
    { id: 'img1', url: 'https://ejemplo.pe/a.webp' },
    { id: 'img2', url: 'https://ejemplo.pe/b.webp' },
  ]
  const lecciones = [
    {
      id: 'l1', title: 'EPP',
      contentJson: { activities: [
        { id: 'a1', teaching: { agent_instruction: 'x', images: [{ url: 'https://ejemplo.pe/a.webp', description: 'd' }] } },
        { id: 'a2', teaching: { agent_instruction: 'x', blocks: [{ id: 'b', type: 'image', url: 'https://otra.pe/z.webp', bankId: 'img1' }] } },
      ] },
    },
    { id: 'l2', title: 'LOTO', contentJson: { activities: [] } },
  ]
  const usos = usosPorImagen(banco, lecciones)
  assert.deepEqual(usos.get('img1'), [{ lessonId: 'l1', title: 'EPP' }])
  assert.deepEqual(usos.get('img2'), [])
})
