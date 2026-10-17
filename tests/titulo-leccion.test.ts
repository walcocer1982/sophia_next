import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tituloParaAlumno } from '../lib/titulo-leccion'

test('quita el código interno del título que ve el alumno', () => {
  assert.equal(tituloParaAlumno('EVA-NOTA · Asistencia y Sistema de Evaluación'), 'Asistencia y Sistema de Evaluación')
  assert.equal(tituloParaAlumno('S0 — Construye tu plan'), 'Construye tu plan')
  assert.equal(tituloParaAlumno('LEC-MAN · Lectura Comprensiva de Manuales'), 'Lectura Comprensiva de Manuales')
  assert.equal(tituloParaAlumno('DIFIC · Detección de Dificultades de Aprendizaje'), 'Detección de Dificultades de Aprendizaje')
})

test('deja igual un título sin código', () => {
  assert.equal(tituloParaAlumno('Electroquímica y Electroobtención de Metales'), 'Electroquímica y Electroobtención de Metales')
  assert.equal(tituloParaAlumno('HTML Básico: Tu Primera Página Web'), 'HTML Básico: Tu Primera Página Web')
  assert.equal(tituloParaAlumno('El ciclo de minado'), 'El ciclo de minado')
})
