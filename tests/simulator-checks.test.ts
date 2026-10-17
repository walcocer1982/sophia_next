import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeResult, describeStateForPrompt, initialState, sanitizeState } from '../lib/simulator'
import { checkReply, checksIntro, checksScore, newChecksState, readCheck } from '../lib/checks'
import { splitChoiceOptions } from '../lib/material-markers'
import type { ChoiceStep, SimulatorBlock } from '../types/lesson'

const nota: SimulatorBlock = {
  id: 'ecualizador-nota', type: 'simulator', title: 'Tu nota', kind: 'weighted_sum',
  variables: [
    { id: 'cv', label: 'CV', weight: 10 }, { id: 'ep', label: 'EP', weight: 20 }, { id: 'ef', label: 'EF', weight: 20 },
    { id: 'tc1', label: 'TC1', weight: 25 }, { id: 'tc2', label: 'TC2', weight: 25 },
  ],
  scale: { min: 0, max: 20, pass: 13, round: 'half_up' },
  presets: [{ label: 'Ana', values: { cv: 10, ep: 11, ef: 14, tc1: 16, tc2: 12 } }],
  allowOwnValues: true,
}

test('la nota de Ana es 13 y aprueba; sin TC2 baja a 10', () => {
  const s = initialState(nota)
  assert.deepEqual(computeResult(nota, s.values), { raw: 13, shown: 13, pass: true })
  assert.equal(computeResult(nota, { ...s.values, tc2: 0 }).shown, 10)
  // 12,5 redondea a 13 (Reglamento): Rosa con TC2 de 10
  assert.equal(computeResult(nota, { cv: 12, ep: 12, ef: 12, tc1: 16, tc2: 10 }).shown, 13)
})

test('el estado del navegador se acota al bloque: variables conocidas y rango 0–20', () => {
  const s = sanitizeState(nota, { values: { cv: 25, ep: -3, ef: 14, tc1: 16, tc2: 12, otra: 99 }, preset: 'Ana', lastChange: { variable: 'cv', from: 10, to: 25 } })
  assert.equal(s?.values.cv, 20)
  assert.equal(s?.values.ep, 0)
  assert.equal('otra' in (s?.values ?? {}), false)
  assert.equal(sanitizeState(nota, { values: { cv: 'x' } }), null)
})

test('Sophia lee el resultado y el último cambio; con notas propias, la orden de no repetirlas', () => {
  const s = sanitizeState(nota, { values: { cv: 10, ep: 11, ef: 14, tc1: 16, tc2: 0 }, preset: 'Ana', lastChange: { variable: 'tc2', from: 12, to: 0 } })!
  const d = describeStateForPrompt(nota, s)
  assert.match(d, /→ resultado 10 \(desaprueba\)/)
  assert.match(d, /TC2 de 12 a 0/)
  const propio = describeStateForPrompt(nota, { ...s, own: true })
  assert.match(propio, /no repitas esos números/)
})

const checks: ChoiceStep[] = [
  { prompt: '¿Con cuántas faltas desapruebas en un curso de 10 sesiones?', options: ['2', '3', '5'], answer: 1 },
  { prompt: '¿Qué vale un trabajo no entregado?', options: ['Se promedia igual', 'Cero', 'Se recupera en el EF'], answer: 1 },
]

test('la comprobación avanza pregunta por pregunta y responde en código', () => {
  let st = newChecksState('sesion', 'cierre', checks)
  const intro = checksIntro(checks, st)
  // Las opciones salen como líneas «A) …» para que el chat las dibuje como botones
  assert.equal(splitChoiceOptions(intro).options.length, 3)
  const letraBuena = (i: number) => 'ABC'[st.orders[i].indexOf(checks[i].answer)]
  let r = readCheck('no sé', checks, st)
  assert.equal(r.turn.kind, 'no_pick')
  r = readCheck(letraBuena(0), checks, st)
  st = r.state
  assert.deepEqual(r.turn, { kind: 'answered', index: 0, correct: true, done: false })
  assert.match(checkReply(checks, st, r.turn, '¿Qué te llevas?'), /^Correcto\.\n\nPregunta 2 de 2/)
  const letraMala = 'ABC'[st.orders[1].indexOf(0)]
  r = readCheck(letraMala, checks, st)
  st = r.state
  const fin = checkReply(checks, st, r.turn, '¿Qué te llevas?')
  assert.match(fin, /^No: era [ABC]\) Cero\./)
  assert.match(fin, /Acertaste 1 de 2\. Ahora, para cerrar: ¿Qué te llevas\?/)
  assert.equal(checksScore(st, 2), 50)
})

test('la comprobación suma una fila de peso 1: fallarla toda no hunde la nota de la lección', async () => {
  const { notaDeLaSesion } = await import('../lib/grading')
  const intento = { attempts: [{ analysis: { understanding_level: 'achieved', completeness_percentage: 100, criteriaMatched: ['a'] } }] }
  const plan = [
    { id: 'p1', type: 'practice', verification: { success_criteria: { must_include: ['a'] } } },
    { id: 'cierre', type: 'closing', checks: [{}, {}, {}], verification: { success_criteria: { must_include: ['a'] } } },
  ]
  const prog = (correct: number) => [
    { activityId: 'p1', attempts: 1, evidenceData: intento },
    { activityId: 'cierre', attempts: 1, evidenceData: { ...intento, checks: { done: true, correct } } },
  ]
  const sinComprobacion = notaDeLaSesion(plan.map((a) => ({ ...a, checks: undefined })), prog(0), 'REFLECTIVE')!
  const todoBien = notaDeLaSesion(plan, prog(3), 'REFLECTIVE')!
  const todoMal = notaDeLaSesion(plan, prog(0), 'REFLECTIVE')!
  assert.ok(todoBien >= todoMal)
  // Peso 1 frente a práctica (3) + cierre (4): fallar todo baja como mucho un octavo
  assert.ok(todoMal >= Math.floor(sinComprobacion * 7 / 8), JSON.stringify({ sinComprobacion, todoMal }))
})

test('si el alumno ya movió el ecualizador, la directiva lo dice y pide no repetir la acción', async () => {
  const { directivaSiYaMovio, presetState } = await import('../lib/simulator')
  const inicial = initialState(nota)
  assert.equal(directivaSiYaMovio(nota, inicial), null)
  const movido = { ...inicial, values: { ...inicial.values, tc2: 0 }, lastChange: { variable: 'tc2', from: 12, to: 0 } }
  const d = directivaSiYaMovio(nota, movido)
  assert.ok(d && d.includes('MOVIÓ TC2 DE 12 A 0') && d.includes('NO le pidas'), d ?? 'sin directiva')
  const conDosCasos = { ...nota, presets: [...nota.presets, { label: 'Semana del TC2', values: { cv: 10, ep: 11, ef: 14, tc1: 14, tc2: 14 } }] }
  assert.ok(directivaSiYaMovio(conDosCasos, presetState(conDosCasos, 'Semana del TC2'))?.includes('CARGÓ EL CASO «SEMANA DEL TC2»'))
})
