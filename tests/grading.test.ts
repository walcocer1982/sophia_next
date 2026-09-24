/**
 * Una sola escala para la actividad y para la lección (lib/grading.ts +
 * lib/rubric.ts). Fija con números las consecuencias que antes no se cumplían:
 * logrado en todo es logrado (no destacado), agotar intentos no aprueba, un
 * eliminatorio nunca cubierto deja en inicio, y el verificador caído no puntúa.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activityScore,
  calculateGrade,
  notaDeLaSesion,
  COMPREHENSION_SCORES,
  type ScorableActivity,
  type ActividadDelPlan,
} from '@/lib/grading'
import { calculateRubricLevel, gradeToRubricLevel, isPassing, PASSING_GRADE, GRADE_THRESHOLDS } from '@/lib/rubric'

type Nivel = keyof typeof COMPREHENSION_SCORES

const intento = (level: Nivel | null, pct = 100, extra: Record<string, unknown> = {}) => ({
  analysis: { understanding_level: level ?? undefined, completeness_percentage: pct, criteriaMatched: [] as string[], ...extra },
})
const act = (attempts: unknown[], o: Partial<ScorableActivity> = {}): ScorableActivity => ({
  attempts: attempts.length,
  evidenceData: { attempts },
  passedCriteria: true,
  ...o,
})

test('cada nivel de actividad cae en su propia banda de la lección', () => {
  const esperado: Record<Nivel, string> = {
    beginning: 'en_inicio',
    developing: 'en_proceso',
    achieved: 'logrado',
    outstanding: 'logrado_destacado',
  }
  for (const nivel of Object.keys(esperado) as Nivel[]) {
    const ap = act([intento(nivel)])
    const score = activityScore(ap)
    assert.ok(score !== null)
    assert.equal(gradeToRubricLevel(score), esperado[nivel], `${nivel} → ${score}`)
    assert.equal(calculateRubricLevel(ap), esperado[nivel])
  }
  // Los puntos medios de banda: ni en el borde ni fuera.
  assert.ok(COMPREHENSION_SCORES.achieved >= GRADE_THRESHOLDS.LOGRADO)
  assert.ok(COMPREHENSION_SCORES.achieved < GRADE_THRESHOLDS.LOGRADO_DESTACADO)
  assert.ok(COMPREHENSION_SCORES.developing < PASSING_GRADE)
})

const plan: ActividadDelPlan[] = [
  { id: 'e', type: 'explanation', verification: { max_attempts: 5 } },
  { id: 'r', type: 'reflection', verification: { max_attempts: 5 } },
  { id: 'p', type: 'practice', verification: { max_attempts: 5 } },
  { id: 'c', type: 'closing', verification: { max_attempts: 5 } },
]
const progreso = (nivel: Nivel, extra: Partial<{ attempts: number; passedCriteria: boolean }> = {}) =>
  plan.map((a) => ({
    activityId: a.id,
    attempts: extra.attempts ?? 1,
    evidenceData: { attempts: Array.from({ length: extra.attempts ?? 1 }, (_, i) => intento(i === (extra.attempts ?? 1) - 1 ? nivel : 'developing')) },
    passedCriteria: extra.passedCriteria ?? true,
  }))

test('logrado en todas las actividades da logrado en la lección, no destacado', () => {
  const nota = notaDeLaSesion(plan, progreso('achieved'), 'REFLECTIVE')
  assert.ok(nota !== null)
  assert.equal(gradeToRubricLevel(nota), 'logrado')
  assert.ok(isPassing(nota))
})

test('agotar los intentos sin cumplir criterios no aprueba', () => {
  // 5 intentos, el mejor «achieved» al final, pero avanzó por límite.
  const ap = act([intento('developing', 30), intento('developing', 30), intento('developing', 30), intento('developing', 30), intento('achieved')], {
    passedCriteria: false,
    maxAttempts: 5,
  })
  const score = activityScore(ap)
  assert.ok(score !== null && score < PASSING_GRADE, `score ${score}`)
  assert.equal(calculateRubricLevel(ap), 'en_proceso')

  const nota = notaDeLaSesion(plan, progreso('achieved', { attempts: 5, passedCriteria: false }), 'REFLECTIVE')
  assert.ok(nota !== null && !isPassing(nota), `nota ${nota}`)
})

test('un criterio eliminatorio nunca cubierto deja la actividad en inicio', () => {
  const sinElCritico = act([intento('achieved', 100, { criteriaMatched: ['b', 'c'] })], { criticalCriteria: ['a'] })
  assert.equal(calculateRubricLevel(sinElCritico), 'en_inicio')

  const conElCritico = act([intento('achieved', 100, { criteriaMatched: ['a', 'b', 'c'] })], { criticalCriteria: ['a'] })
  assert.equal(calculateRubricLevel(conElCritico), 'logrado')

  // Cubierto en un intento anterior también cuenta.
  const cubiertoAntes = act(
    [intento('developing', 33, { criteriaMatched: ['a'] }), intento('achieved', 100, { criteriaMatched: ['b', 'c'] })],
    { criticalCriteria: ['a'] }
  )
  assert.equal(calculateRubricLevel(cubiertoAntes), 'logrado')
})

test('un intento sin verificar no puntúa ni pesa en el denominador', () => {
  const sinVerificar = act([{ analysis: { unverified: true } }], { passedCriteria: false })
  assert.equal(activityScore(sinVerificar), null)
  assert.equal(calculateRubricLevel(sinVerificar), null)
  assert.equal(calculateGrade([sinVerificar]), null)

  const dos: ActividadDelPlan[] = [
    { id: 'e', type: 'explanation' },
    { id: 'p', type: 'practice' },
  ]
  const nota = notaDeLaSesion(
    dos,
    [
      { activityId: 'e', attempts: 1, evidenceData: { attempts: [intento('achieved')] }, passedCriteria: true },
      { activityId: 'p', attempts: 1, evidenceData: { attempts: [{ analysis: { unverified: true } }] }, passedCriteria: false },
    ],
    'REFLECTIVE'
  )
  // Solo cuenta la explicación (63): la práctica sin verificar no baja la nota.
  assert.equal(nota, Math.round(COMPREHENSION_SCORES.achieved))
})

test('weight 0 en todas las actividades vuelve a los pesos por tipo', () => {
  const planCero = plan.map((a) => ({ ...a, weight: 0 }))
  const nota = notaDeLaSesion(planCero, progreso('achieved'), 'REFLECTIVE')
  assert.equal(nota, Math.round(COMPREHENSION_SCORES.achieved))
})

test('«logrado» con 0 % de completitud se lee como en proceso', () => {
  assert.equal(calculateRubricLevel(act([intento('achieved', 0)])), 'en_proceso')
})

test('la penalidad por intentos es relativa a los permitidos y no cambia de banda', () => {
  const tarde = act([intento('developing', 30), intento('developing', 30), intento('developing', 30), intento('developing', 30), intento('achieved')], { maxAttempts: 5 })
  const score = activityScore(tarde)
  assert.equal(score, Math.round(COMPREHENSION_SCORES.achieved * 0.9))
  assert.equal(gradeToRubricLevel(score!), 'logrado')

  const temprano = act([intento('developing', 30), intento('achieved')], { maxAttempts: 5 })
  assert.equal(activityScore(temprano), Math.round(COMPREHENSION_SCORES.achieved))
})
