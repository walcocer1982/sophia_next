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

test('una respuesta escrita larga que repite una frase técnica no es ruido (simulación del 21 oct)', () => {
  const r = detectHallucination('Sí profe, es trabajo en altura según la G.050, aunque esté a 1,50 m. La razón es clara: aunque no llega a los 1,80 m, hay una instalación eléctrica energizada justo debajo. La norma dice que a cualquier altura se cuenta como trabajo en altura si hay electricidad activa debajo. Entonces el electricista está expuesto, y eso activa la protección completa: arnés, línea de vida, permiso de trabajo en altura, todo.')
  assert.equal(r.isHallucination, false, r.reason)
  assert.equal(detectHallucination('cómo puede ver cómo puede ver cómo puede ver cómo puede ver').isHallucination, true)
})
