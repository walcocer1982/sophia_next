import { test } from 'node:test'
import assert from 'node:assert/strict'
import { revisarTitulo, avisosDeTitulos, nombreDeActividad } from '../lib/planner/titulos'

test('acepta nombres de tema en tono de sílabo', () => {
  for (const t of [
    'Asistencia y sistema de evaluación',
    'Justificación de inasistencias',
    'Ponderación de la nota final',
    'Sustento técnico verificable',
    'Electroquímica y electroobtención de metales',
    'Procedimiento ante una inasistencia',
  ]) assert.deepEqual(revisarTitulo(t), [], t)
})

test('marca código interno, pregunta, orden, mayúsculas de estilo inglés y punto final', () => {
  assert.ok(revisarTitulo('EVA-NOTA · Asistencia y sistema de evaluación').some((m) => m.includes('código')))
  assert.ok(revisarTitulo('S1 — Gana el TC: entiende la rúbrica antes de empezar').length >= 1)
  assert.ok(revisarTitulo('¿Cómo se arma tu nota?').some((m) => m.includes('pregunta')))
  assert.ok(revisarTitulo('Justifica una falta a tiempo').some((m) => m.includes('orden')))
  assert.ok(revisarTitulo('Asistencia y Sistema de Evaluación').some((m) => m.includes('Mayúscula')))
  assert.ok(revisarTitulo('Tolerancia y tardanza.').some((m) => m.includes('punto')))
})

test('un personaje del caso en el título va al subtítulo', () => {
  const actividades = [
    { id: 'a1', title: 'Mario con fiebre', teaching: { blocks: [{ type: 'case', name: 'Mario' }] } },
    { id: 'a2', title: 'Justificación de inasistencias', subtitle: 'Caso Mario', teaching: { blocks: [] } },
    { id: 'a3', teaching: { blocks: [] } },
  ]
  const avisos = avisosDeTitulos('Asistencia y sistema de evaluación', actividades)
  assert.deepEqual(avisos.map((a) => a.activityId), ['a1', 'a3'])
  assert.ok(avisos[0].motivos.some((m) => m.includes('personaje')))
})

test('sin título, el alumno ve «Actividad N»', () => {
  assert.equal(nombreDeActividad({}, 3), 'Actividad 4')
  assert.equal(nombreDeActividad({ title: ' Tolerancia y tardanza ' }, 0), 'Tolerancia y tardanza')
})
