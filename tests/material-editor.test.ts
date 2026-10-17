import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  captionLeaks,
  migrateLegacyImages,
  newBlock,
  sanitizeGeneratedBlocks,
  referenceToBlock,
  slugifyId,
  uniqueBlockId,
  validateMaterial,
} from '../lib/material-editor'
import type { Activity } from '../types/lesson'

const act = (id: string, teaching: Partial<Activity['teaching']> = {}): Activity => ({
  id,
  type: 'practice',
  keyPointIndex: 0,
  teaching: { agent_instruction: 'Instrucción de prueba con más de veinte caracteres', ...teaching },
  verification: { question: '¿Por qué elegiste esa opción?', success_criteria: { must_include: ['algo'], min_completeness: 60, understanding_level: 'developing' } },
})

test('el id sale del título, sin tildes y único en la lección', () => {
  assert.equal(slugifyId('Semáforo de faltas'), 'semaforo-de-faltas')
  assert.equal(uniqueBlockId('Semáforo de faltas', ['semaforo-de-faltas']), 'semaforo-de-faltas-2')
  assert.equal(uniqueBlockId('Tabla', ['tabla', 'tabla-2']), 'tabla-3')
})

test('las imágenes viejas pasan a bloques con el mismo id que les daba el adaptador', () => {
  const vieja = act('a1', { images: [{ url: 'https://ejemplo.pe/a.webp', description: 'Una foto de un equipo de prueba' }] })
  const nueva = migrateLegacyImages(vieja)
  assert.equal(nueva.teaching.images, undefined)
  assert.equal(nueva.teaching.image, undefined)
  assert.equal(nueva.teaching.blocks?.[0].id, 'a1-img-1')
  assert.equal(nueva.teaching.blocks?.[0].type, 'image')
  // Una actividad sin imágenes viejas no cambia
  const sin = act('a2')
  assert.equal(migrateLegacyImages(sin), sin)
})

test('una referencia «Caso X:» se vuelve caso con un hecho por oración', () => {
  const b = referenceToBlock('Caso Rosa (estudiante ficticia): 12 en evaluaciones; 16 en el TC1. Mañana vence el TC2.', [])
  assert.equal(b.type, 'case')
  if (b.type !== 'case') return
  assert.equal(b.name, 'Rosa')
  assert.equal(b.title, 'Caso: Rosa')
  assert.deepEqual(b.facts, ['12 en evaluaciones', '16 en el TC1', 'Mañana vence el TC2'])
})

test('una referencia con fragmento entre comillas se vuelve texto con su título', () => {
  const b = referenceToBlock('Fragmento 2 — Bloqueo y etiquetado (LOTO): «El bloqueo es el procedimiento para aislar la energía.»', [])
  assert.equal(b.type, 'text')
  if (b.type !== 'text') return
  assert.equal(b.title, 'Bloqueo y etiquetado (LOTO)')
  assert.equal(b.body, 'El bloqueo es el procedimiento para aislar la energía.')
})

test('un pie de foto que repite la respuesta esperada se detecta', () => {
  assert.deepEqual(captionLeaks('Protector mal puesto', ['El protector auditivo está en el cuello, mal puesto']), ['protector', 'puesto'])
  assert.deepEqual(captionLeaks('Trabajador 1', ['El protector auditivo está en el cuello']), [])
})

test('un bloque nuevo vacío no pasa la validación y el error se ubica en el bloque', () => {
  const ids: string[] = []
  const tabla = newBlock('table', ids)
  const caso = newBlock('case', [tabla.id])
  const errores = validateMaterial([act('a1', { blocks: [tabla] }), act('a2', { blocks: [caso] })])
  // La tabla de ejemplo es válida; el caso sin nombre no
  assert.ok(errores.every((e) => e.activityIndex === 1 && e.blockIndex === 0))
  assert.ok(errores.length > 0)
})

test('los errores salen en español y nombran el campo', () => {
  const caso = newBlock('case', [])
  const [e] = validateMaterial([act('a1', { blocks: [caso] }), act('a2')])
  assert.equal(e.message, 'nombre: falta completarlo')
})

test('del planner se descarta solo el bloque malo, nunca toda la estructura', () => {
  const crudo = [
    act('a1', {
      blocks: [
        { id: 'semaforo', type: 'table', title: 'Semáforo de faltas', columns: ['Faltas', 'Color'], rows: [['0-1', 'Verde']] },
        { id: 'semaforo', type: 'case', title: 'Caso Ana', name: 'Ana', facts: ['Lleva 2 faltas'] }, // id repetido: se renombra
        { id: 'foto', type: 'image', title: 'Foto inventada', url: 'https://inventada.pe/x.jpg' }, // imagen: se descarta
        { id: 'tabla-corta', type: 'table', title: 'Corta', columns: ['A', 'B'], rows: [['solo una']] }, // fila corta: se completa
        { id: 'diagrama-malo', type: 'diagram', title: 'Un paso', kind: 'flow', nodes: [{ id: 'n1', label: 'Solo uno' }] }, // < 2 pasos: se descarta
      ] as never,
    }),
    act('a2'),
  ]
  const { activities, dropped } = sanitizeGeneratedBlocks(crudo)
  assert.equal(dropped, 2)
  const bloques = (activities as Activity[])[0].teaching.blocks!
  assert.deepEqual(bloques.map((b) => b.id), ['semaforo', 'caso-ana', 'tabla-corta'])
  assert.deepEqual(validateMaterial(activities as Activity[]), [])
})

test('un bloque de fórmula incompleto dice qué campo falla, no «Invalid input»', () => {
  const formula = { id: 'formula-x', type: 'formula', title: 'Fórmula de prueba', expression: 't = V / Q', example: { label: 'Acumulador', rows: [], total: '5 min' } }
  const errores = validateMaterial([act('a1', { blocks: [formula as never] }), act('a2')])
  assert.ok(errores.length > 0)
  assert.ok(errores.every((e) => !/invalid input/i.test(e.message)), JSON.stringify(errores))
})

test('lo que el planner se pasa de largo se ajusta en vez de descartarse', () => {
  const largo = 'x'.repeat(80)
  const crudo = [
    act('a1', {
      blocks: [
        { id: 'resp', type: 'table', title: 'Responsabilidades', columns: ['Rol', 'Qué hace'], rows: [['Supervisor', largo], ['Trabajador']] },
        { id: 'caso-p', type: 'case', title: 'Caso: prensa', name: 'Prensa hidráulica en mantenimiento preventivo anual', facts: ['Tiene un acumulador de 20 L'] },
        { id: 'f', type: 'formula', title: 'Descarga', expression: 't = V / Q', example: { label: 'Ejemplo', rows: [{ term: 'V', value: '15', weight: 'L' }], total: '5 min' } },
      ] as never,
    }),
    act('a2'),
  ]
  const { activities, dropped } = sanitizeGeneratedBlocks(crudo)
  assert.equal(dropped, 0)
  const [tabla, caso, formula] = (activities as Activity[])[0].teaching.blocks!
  assert.equal(tabla.type === 'table' && tabla.rows[0][1].length, 60)
  assert.deepEqual(tabla.type === 'table' && tabla.rows[1], ['Trabajador', ''])
  assert.equal(caso.type === 'case' && caso.name.length, 40)
  // El ejemplo sin resultado se quita; la fórmula queda
  assert.equal(formula.type === 'formula' && formula.example, undefined)
})
