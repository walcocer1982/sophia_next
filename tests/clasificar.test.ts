import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeClasifForPrompt, describeClasifForVerifier, mover, resultado, sanitizeClasif, vacio } from '../lib/clasificar'
import { SupportBlockSchemaByType } from '../lib/planner/validation'
import type { ClassifyBlock } from '../types/lesson'

const bloque: ClassifyBlock = {
  id: 'clasificar-x',
  type: 'classify',
  title: 'Ordena los casos',
  bins: [{ id: 'a', label: 'Columna A' }, { id: 'b', label: 'Columna B' }],
  cards: [
    { id: 'uno', text: 'Caso uno', bin: 'a' },
    { id: 'dos', text: 'Caso dos', bin: 'b' },
    { id: 'tres', text: 'Caso tres', bin: 'a' },
  ],
}

test('el estado del navegador se acota a tarjetas y columnas de la lección', () => {
  const s = sanitizeClasif(bloque, { placements: { uno: 'a', dos: 'zeta', otra: 'b' }, lastMove: { card: 'uno', to: 'a' } })
  assert.deepEqual(s, { placements: { uno: 'a' }, lastMove: { card: 'uno', to: 'a' } })
  assert.equal(sanitizeClasif(bloque, 'basura'), null)
})

test('mover, devolver y contar', () => {
  let s = mover(vacio(), 'uno', 'a')
  s = mover(s, 'dos', 'a')
  assert.deepEqual(resultado(bloque, s), { total: 3, ubicadas: 2, bien: 1 })
  s = mover(s, 'dos', null)
  assert.deepEqual(resultado(bloque, s), { total: 3, ubicadas: 1, bien: 1 })
})

test('Sophia sabe cuál está mal sin decírselo; el verificador recibe lo que hizo', () => {
  const s = mover(mover(vacio(), 'uno', 'a'), 'dos', 'a')
  const p = describeClasifForPrompt(bloque, s)
  assert.ok(p.includes('«Caso dos» → «Columna A» (NO es la correcta; la correcta es «Columna B»)'), p)
  assert.ok(p.includes('Sin ubicar: «Caso tres»'), p)
  assert.ok(p.includes('no le digas cuál es la columna correcta'), p)
  assert.equal(describeClasifForVerifier(bloque, vacio()), null)
  assert.equal(describeClasifForVerifier(bloque, s), 'En la pizarra, «Ordena los casos», el estudiante ubicó con su mano (cuenta como su decisión, pero no como su razón): «Caso uno» en «Columna A»; «Caso dos» en «Columna A».')
})

test('el esquema rechaza una tarjeta que apunta a una columna inexistente', () => {
  assert.equal(SupportBlockSchemaByType.classify.safeParse(bloque).success, true)
  const malo = { ...bloque, cards: [...bloque.cards, { id: 'cuatro', text: 'Caso cuatro', bin: 'z' }] }
  assert.equal(SupportBlockSchemaByType.classify.safeParse(malo).success, false)
})
