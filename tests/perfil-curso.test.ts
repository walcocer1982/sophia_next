/**
 * Perfil de Sophia en las sesiones de curso (lib/perfil-curso.ts, 27 oct 2026).
 * Los textos son los literales de las clases reales de octubre.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearQuitadorDePreguntas, preguntaDelTurno, preguntaEnNegrita } from '@/lib/perfil-curso'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import { REGISTRO } from '../scripts/cetemin/cursos/registro'
import { construirActividades, subidasFalsas } from '../scripts/cetemin/plantillas'
import { compartenPalabraClave } from '../scripts/cetemin/validar'
import type { Activity, ActivityCompletionResult, CurrentActivityContext } from '@/types/lesson'

const sinPreguntas = (texto: string, paso: number) => {
  const q = crearQuitadorDePreguntas()
  let salida = ''
  for (let i = 0; i < texto.length; i += paso) salida += q.push(texto.slice(i, i + paso))
  return salida + q.flush()
}

test('quita la pregunta de la actividad anterior que Sophia repetía al cerrar por límite (EOM S4)', () => {
  // Real: tras el cierre por límite, Sophia volvió a pedir la letra y el código pegó la pregunta nueva.
  const texto = 'No exactamente. "Muy pobre" es la descripción de la condición superficial (MP), pero no es la letra de calidad que la cartilla asigna a esa casilla. Mira la casilla IF/MP en la cartilla: ¿qué letra (A, B, C, D, E o F) aparece en esa celda?'
  for (const paso of [1, 3, 7, 40, texto.length]) {
    const salida = sinPreguntas(texto, paso)
    assert.ok(!/[?¿]/.test(salida), `paso ${paso}: ${salida}`)
    assert.ok(salida.includes('no es la letra de calidad que la cartilla asigna'), `paso ${paso}: ${salida}`)
  }
})

test('deja lo que enseña antes de la pregunta, aunque llegue en el mismo trozo', () => {
  const texto = 'Cada casilla trae su letra. Por ejemplo: en el crucero 5 la celda dio LF/R y el capataz anota B. ¿En qué banda de RMR cae esa roca?'
  assert.equal(sinPreguntas(texto, texto.length).trim(), 'Cada casilla trae su letra. Por ejemplo: en el crucero 5 la celda dio LF/R y el capataz anota B.')
})

test('una pregunta en negrita sale entera, sin dejar «**» suelto', () => {
  const texto = 'Esa es la regla.\n\n**¿Ya ingresó al espacio confinado, y por qué?**\n\nMira el texto de la pizarra.'
  for (const paso of [1, 5, texto.length]) {
    const salida = sinPreguntas(texto, paso)
    assert.ok(!salida.includes('**'), `paso ${paso}: ${JSON.stringify(salida)}`)
    assert.ok(salida.includes('Esa es la regla.') && salida.includes('Mira el texto de la pizarra.'))
  }
})

test('conserva el marcador del panel de una oración quitada', () => {
  const salida = sinPreguntas('Mira la lámina «Clases y letras» [[block:clases]]: ¿cuántas letras ves en la Clase III? Fíjate en la barra.', 4)
  assert.ok(salida.includes('[[block:clases]]'))
  assert.ok(!salida.includes('?'))
})

test('la pregunta en negrita no duplica asteriscos', () => {
  assert.equal(preguntaEnNegrita('**¿Está bien, y por qué?**'), '**¿Está bien, y por qué?**')
})

// ── Qué pregunta pone el código en cada turno ─────────────────────────────

const spec = REGISTRO['si-altoriesgo'].sesiones[4]
const acts = construirActividades(spec, subidasFalsas(spec))
const [veo, , mePregunto, pc1, pc2] = acts
const caso = acts.find((a) => a.rol === 'caso_corto')!
const cierre = acts[acts.length - 1]
const sinRol = (a: Activity): Activity => ({ ...a, rol: undefined })
const base = { respuestaFija: false, pasoCerrado: false, yaCompletada: false, sinVerificar: false, turnoDeConexion: false, esUltima: false }

test('la plantilla da a cada actividad su rol, en orden', () => {
  assert.deepEqual(acts.map((a) => a.rol), ['veo', 'pienso', 'me_pregunto', 'punto_clave', 'punto_clave', 'punto_clave', 'caso_corto', 'cierre'])
  assert.ok(!/califiques|tal cual|negrita/i.test(pc1.teaching.agent_instruction), pc1.teaching.agent_instruction)
})

test('al pasar de la rutina al primer punto clave, el código pone la pregunta del punto clave', () => {
  assert.equal(preguntaDelTurno({ ...base, actual: mePregunto, siguiente: pc1, avanza: true }), pc1.verification.question)
})

test('con el punto clave abierto, el código repite su pregunta; al cerrarlo, pone la siguiente', () => {
  assert.equal(preguntaDelTurno({ ...base, actual: pc1, siguiente: pc2, avanza: false }), pc1.verification.question)
  assert.equal(preguntaDelTurno({ ...base, actual: pc1, siguiente: pc2, avanza: true }), pc2.verification.question)
  assert.equal(preguntaDelTurno({ ...base, actual: caso, siguiente: cierre, avanza: true }), cierre.verification.question)
})

test('no pone pregunta en la rutina, en un mensaje fijo, al terminar la lección ni en lecciones sin rol', () => {
  assert.equal(preguntaDelTurno({ ...base, actual: veo, siguiente: acts[1], avanza: true }), null)
  assert.equal(preguntaDelTurno({ ...base, actual: pc1, avanza: false, respuestaFija: true }), null)
  assert.equal(preguntaDelTurno({ ...base, actual: cierre, avanza: true, esUltima: true }), null)
  assert.equal(preguntaDelTurno({ ...base, actual: sinRol(pc1), avanza: false }), null)
})

// ── El prompt de una sesión de curso ──────────────────────────────────────

function contexto(activity: Activity): CurrentActivityContext {
  return {
    activity,
    activityIdx: acts.indexOf(activity),
    totalActivities: acts.length,
    isFirstActivity: false,
    isLastActivity: false,
    lessonTitle: spec.title,
    lessonObjective: spec.objective,
    lessonKeyPoints: spec.keyPoints,
    courseInstructor: 'Eres Sophia, instructora de seguridad.',
  }
}
const parcial: ActivityCompletionResult = {
  completed: false,
  criteriaMatched: ['Decide que sí ingresó'],
  criteriaMissing: ['Da la razón: se ingresa cuando cualquier parte del cuerpo cruza la abertura'],
  completeness_percentage: 50,
  understanding_level: 'developing',
  response_type: 'partial',
  feedback: '',
  confidence: 'high',
  ready_to_advance: false,
  student_intent: 'answer',
  needs_scaffolding: true,
  next_subquestion: '¿Qué parte del cuerpo cruzó la boca del tanque?',
}

test('en una sesión de curso el prompt no trae las reglas de tutoría que la contradecían', () => {
  const p = buildSystemPrompt({ activityContext: contexto(pc1), recentMessages: [], attempts: 1, verificationResult: parcial, preguntaDelCodigo: pc1.verification.question })
  const todo = `${p.staticBlocks.map((b) => b.text).join('\n')}\n${p.dynamicPrompt}`
  for (const prohibido of ['No repitas exactamente la misma pregunta', 'PISTAS PROGRESIVAS', 'TURNO 1: Presenta el escenario', 'SUB-PREGUNTA SUGERIDA', 'PISTA SUTIL', '¿Qué parte del cuerpo cruzó']) {
    assert.ok(!todo.includes(prohibido), `no debería aparecer: ${prohibido}`)
  }
  for (const debe of ['CÓMO ENSEÑAS EN ESTA SESIÓN', 'ROL: PUNTO CLAVE', 'LA PREGUNTA LA PONE EL SISTEMA']) {
    assert.ok(todo.includes(debe), `falta: ${debe}`)
  }
})

test('una lección sin rol sigue con el prompt de tutoría de siempre', () => {
  const p = buildSystemPrompt({ activityContext: contexto(sinRol(pc1)), recentMessages: [] })
  assert.ok(p.staticBlocks[0].text.includes('REGLAS IMPORTANTES'))
  assert.ok(!p.staticBlocks[0].text.includes('CÓMO ENSEÑAS EN ESTA SESIÓN'))
})

test('en la transición a un punto clave, Sophia recibe la guía del rol siguiente y no escribe la pregunta', () => {
  const p = buildSystemPrompt({
    activityContext: contexto(mePregunto),
    recentMessages: [],
    verificationResult: { ...parcial, completed: true, ready_to_advance: true, criteriaMissing: [] },
    nextActivity: pc1,
    preguntaDelCodigo: pc1.verification.question,
  })
  assert.ok(p.dynamicPrompt.includes('ROL: PUNTO CLAVE'))
  assert.ok(p.dynamicPrompt.includes('NO escribas la pregunta de la siguiente actividad'))
  assert.ok(!p.dynamicPrompt.includes('Termina con la pregunta de verificación TAL CUAL'))
})

// ── Validador: la razón está en la línea que se toca ──────────────────────

test('la razón de EOM S4 no estaba en la línea de las bandas; con la fila IF en el texto, sí', () => {
  const razon = 'en la cartilla, la casilla IF/MP es calidad F'
  assert.equal(compartenPalabraClave(razon, 'D: 41 a 50 · E: 21 a 40 · F: menos de 20.'), false)
  assert.equal(compartenPalabraClave(razon, 'Fila IF (más de 20 fracturas): IF/R da D–E · IF/P da E–F · IF/MP da F.'), true)
})
