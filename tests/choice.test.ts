import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyPick, choiceOrder, letterOf, newChoiceState, parseChoicePick, renderChoice } from '../lib/choice'

const choice = {
  prompt: 'Luis sacó 15 y figura como desaprobado. ¿Por qué?',
  options: ['le anularon el examen', 'superó el límite de faltas', 'no entregó un TC'],
  answer: 1,
}

test('el orden es determinista por semilla y es una permutación', () => {
  const a = choiceOrder('sesion1:act1', 3)
  const b = choiceOrder('sesion1:act1', 3)
  assert.deepEqual(a, b)
  assert.deepEqual([...a].sort(), [0, 1, 2])
  // Semillas distintas no siempre dan el mismo orden (sobre varias semillas)
  const distintos = new Set(['s1', 's2', 's3', 's4', 's5', 's6'].map((s) => choiceOrder(s + ':x', 4).join('')))
  assert.ok(distintos.size > 1)
})

test('renderiza con letras en el orden presentado', () => {
  const order = [2, 0, 1]
  const texto = renderChoice(choice, order)
  assert.ok(texto.startsWith(choice.prompt))
  assert.ok(texto.includes('A) no entregó un TC'))
  assert.ok(texto.includes('C) superó el límite de faltas'))
  assert.equal(letterOf(order, 1), 'C')
})

test('lee la letra con o sin muletilla, el número y el texto de la opción', () => {
  const order = [2, 0, 1] // A=no entregó, B=anularon, C=faltas
  assert.equal(parseChoicePick('c', choice, order), 1)
  assert.equal(parseChoicePick('la B', choice, order), 0)
  assert.equal(parseChoicePick('creo que la c porque sí', choice, order), 1)
  assert.equal(parseChoicePick('C)', choice, order), 1)
  // Lo que envía el botón de alternativa del chat: letra y texto
  assert.equal(parseChoicePick('B) le anularon el examen', choice, order), 0)
  assert.equal(parseChoicePick('A) no entregó un TC', choice, order), 2)
  assert.equal(parseChoicePick('3', choice, order), 1)
  assert.equal(parseChoicePick('fue porque supero el limite de faltas', choice, order), 1)
})

test('no inventa una elección cuando el mensaje no elige', () => {
  const order = [0, 1, 2]
  assert.equal(parseChoicePick('no se', choice, order), null)
  assert.equal(parseChoicePick('si estoy listo', choice, order), null)
  assert.equal(parseChoicePick('puede ser cualquiera de las tres', choice, order), null)
})

test('resuelve al acertar y revela al agotar los intentos', () => {
  let s = newChoiceState('sem:act', choice)
  s = applyPick(s, choice, 0)
  assert.equal(s.resolved, false)
  assert.equal(s.revealed, false)
  s = applyPick(s, choice, 2)
  assert.equal(s.resolved, true)
  assert.equal(s.correct, false)
  assert.equal(s.revealed, true)

  let ok = newChoiceState('sem:act', choice)
  ok = applyPick(ok, choice, 1)
  assert.equal(ok.resolved, true)
  assert.equal(ok.correct, true)
  assert.equal(ok.revealed, false)
})

test('el texto del botón no es una razón; una justificación propia sí', async () => {
  const { esEleccionConRazon } = await import('../lib/choice')
  const opcion = 'Ya cuenta como inasistencia, pero entras y te quedas toda la sesión para no perder la clase'
  assert.equal(esEleccionConRazon(`D) ${opcion}`, opcion), false)
  assert.equal(esEleccionConRazon('la d', opcion), false)
  assert.equal(esEleccionConRazon('La D, porque aunque ya sea falta igual necesito la clase para el examen', opcion), true)
})
