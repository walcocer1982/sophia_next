import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectHallucination } from '../lib/hallucination-detector'

test('un cálculo escrito con dígitos y porcentajes no es alucinación', () => {
  const r = detectHallucination('cv 10 por 10% es 1, ep 11 por 20% es 2.2, ef 14 por 20% es 2.8, tc1 16 por 25% es 4, tc2 12 por 25% es 3. suma 1+2.2+2.8+4+3 = 13')
  assert.equal(r.isHallucination, false)
})

test('un despeje con fórmulas tampoco', () => {
  const r = detectHallucination('(12 + 14) / 2 = 13, entonces (16 + x) / 2 = 14 y x = 12')
  assert.equal(r.isHallucination, false)
})

test('el ruido de transcripción sigue detectándose', () => {
  assert.equal(detectHallucination('ADRIAN PORDA ALFARONE ALFARONE').isHallucination, true)
  assert.equal(detectHallucination('Bienvenidos a Communication Labs もしくはコネクタイヤ').isHallucination, true)
  assert.equal(detectHallucination('%%% ### @@@ !!! $$$ ^^^ &&& *** ((( ))) ___').isHallucination, true)
})
