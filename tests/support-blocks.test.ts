import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLessonBlocks, blocksForActivity, buildMaterialPrompt, getActivityBlocks, serializeBlockForPrompt } from '../lib/support-blocks'
import { GeneratedStructureSchema } from '../lib/planner/validation'
import type { Activity, LessonContent, SupportBlock } from '../types/lesson'

const verif = { question: '¿Pregunta de prueba suficientemente larga?', success_criteria: { must_include: ['algo'] } }

function act(id: string, teaching: Partial<Activity['teaching']> = {}): Activity {
  return {
    id,
    type: 'practice',
    keyPointIndex: 0,
    teaching: { agent_instruction: 'Instrucción de prueba con más de veinte caracteres.', ...teaching },
    verification: verif,
  } as Activity
}

const formula: SupportBlock = {
  id: 'formula-nota', type: 'formula', title: 'Cómo se arma tu nota', pinned: true,
  expression: 'nota final = CV × 10 % + EP × 20 %',
  example: { label: 'Pedro', rows: [{ term: 'CV', value: '14', weight: '10 %', result: '1,4' }], total: '13,65 → 14' },
}
const semaforo: SupportBlock = {
  id: 'semaforo', type: 'table', title: 'Semáforo de faltas',
  columns: ['Sesiones', 'Verde', 'Amarillo', 'Rojo'],
  rows: [['10', '0–1', '2', '3'], ['12', '0–2', '3', '4'], ['16', '0–3', '4', '5'], ['24', '0–6', '7', '8']],
  legend: 'Rojo = ya llegó al 30 %.',
}
const sinValidar: SupportBlock = {
  id: 'foto-pendiente', type: 'image', title: 'Foto pendiente', url: 'https://ejemplo.pe/foto.webp',
  description: 'Trabajador en altura con arnés.', kind: 'scene', license: 'Uso autorizado', validated: false, source: 'Planta, 2025',
}

const leccion: LessonContent = {
  activities: [
    act('a1', { images: [{ url: 'https://ejemplo.pe/vieja.webp', description: 'Imagen vieja de la lección', showWhen: 'on_start' }] }),
    act('a2', { blocks: [formula] }),
    act('a3', { blocks: [semaforo, sinValidar] }),
  ],
} as LessonContent

test('las imágenes viejas se leen como bloques validados, sin tocar los datos', () => {
  const bloques = getActivityBlocks(leccion.activities[0])
  assert.equal(bloques.length, 1)
  assert.equal(bloques[0].type, 'image')
  assert.equal(bloques[0].id, 'a1-img-1')
  if (bloques[0].type === 'image') {
    assert.equal(bloques[0].validated, true)
    assert.equal(bloques[0].showWhen, 'on_start')
  }
})

test('un bloque fijado acompaña a las actividades siguientes, no a las anteriores', () => {
  const enA3 = blocksForActivity(leccion, 'a3')
  assert.deepEqual(enA3.pinned.map((b) => b.id), ['formula-nota'])
  assert.deepEqual(enA3.current.map((b) => b.id), ['semaforo'])
  const enA2 = blocksForActivity(leccion, 'a2')
  assert.deepEqual(enA2.pinned, [])
  assert.deepEqual(enA2.current.map((b) => b.id), ['formula-nota'])
})

test('una imagen sin validar no llega al alumno, solo a la sesión de prueba', () => {
  assert.ok(!allLessonBlocks(leccion).some((b) => b.id === 'foto-pendiente'))
  assert.ok(allLessonBlocks(leccion, true).some((b) => b.id === 'foto-pendiente'))
})

test('el prompt cita por título y no recibe la tabla completa', () => {
  const texto = serializeBlockForPrompt(semaforo)
  assert.match(texto, /4 filas/)
  assert.match(texto, /y 1 filas más/)
  assert.doesNotMatch(texto, /24 \| 0–6/)
  const prompt = buildMaterialPrompt([semaforo], [formula])
  assert.match(prompt, /FÓRMULA «Cómo se arma tu nota» — FIJO/)
  // El id no va entre corchetes al inicio: Sophia lo copiaba al chat
  assert.doesNotMatch(prompt, /\[formula-nota\]/)
  assert.match(prompt, /id interno: formula-nota/)
  assert.match(prompt, /NUNCA copies en el chat/)
})

test('el texto largo no viaja entero al prompt', () => {
  const largo: SupportBlock = {
    id: 'extintores', type: 'text', title: 'Manual de extintores', source: 'NTP 350.043-1',
    body: 'Un extintor portátil es un equipo.\nLos fuegos se clasifican por el material.\nProcedimiento de uso: halar el seguro.\nNunca use agua en fuegos eléctricos.',
  }
  const texto = serializeBlockForPrompt(largo)
  assert.match(texto, /fuente NTP 350.043-1/)
  assert.doesNotMatch(texto, /Nunca use agua/)
})

test('el validador acepta los siete tipos y rechaza lo que no cumple', () => {
  const ok = GeneratedStructureSchema.safeParse({ activities: [act('x1', { blocks: [formula, semaforo] }), act('x2', { blocks: [sinValidar] })] })
  assert.equal(ok.success, true, JSON.stringify(!ok.success && ok.error.issues))

  const repetido = GeneratedStructureSchema.safeParse({ activities: [act('x1', { blocks: [semaforo] }), act('x2', { blocks: [semaforo] })] })
  assert.equal(repetido.success, false)

  const generada = GeneratedStructureSchema.safeParse({
    activities: [act('x1', { blocks: [{ ...sinValidar, license: 'Generada con IA' } as SupportBlock] }), act('x2')],
  })
  assert.equal(generada.success, false)

  const filaCorta = GeneratedStructureSchema.safeParse({
    activities: [act('x1', { blocks: [{ ...semaforo, rows: [['10', '0–1']] } as SupportBlock] }), act('x2')],
  })
  assert.equal(filaCorta.success, false)

  const dibujoEquipo = GeneratedStructureSchema.safeParse({
    activities: [act('x1', { blocks: [{ id: 'jumbo', type: 'diagram', title: 'Partes del jumbo', kind: 'hierarchy', nodes: [{ id: 'a', label: 'Brazo' }, { id: 'b', label: 'Cabina' }] } as SupportBlock] }), act('x2')],
  })
  assert.equal(dibujoEquipo.success, false)
})


test('lo fijado se abre solo donde la actividad lo usa; en reflexión y cierre se pliega', async () => {
  const { pinnedStaysOpen } = await import('../lib/support-blocks')
  assert.equal(pinnedStaysOpen({ type: 'practice', uses: ['ecualizador-nota'], hasBlocks: false }, 'ecualizador-nota'), true)
  assert.equal(pinnedStaysOpen({ type: 'practice', uses: ['ecualizador-nota'], hasBlocks: false }, 'formula-nota'), false)
  assert.equal(pinnedStaysOpen({ type: 'practice', hasBlocks: false }, 'manual'), true)
  assert.equal(pinnedStaysOpen({ type: 'practice', hasBlocks: true }, 'manual'), false)
  assert.equal(pinnedStaysOpen({ type: 'closing', hasBlocks: false }, 'ecualizador-nota'), false)
  assert.equal(pinnedStaysOpen(undefined, 'manual'), true)
})
