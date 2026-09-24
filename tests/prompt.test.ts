/**
 * El prompt del tutor y los del verificador, sin contradicciones ni voseo.
 *
 * Cada vez que alguien agregó una regla al prompt, quedó al lado de la regla
 * contraria («da opciones: ¿A o B?» junto a «PROHIBIDO listar opciones»). Esta
 * prueba construye el prompt en cada estado por el que pasa una clase y falla
 * si reaparece una de esas parejas, un imperativo en voseo bajo la regla que lo
 * prohíbe, o la escala de niveles vieja en el verificador.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import {
  buildOpenEndedVerificationPrompt,
  buildStandardVerificationPrompt,
  buildRubricVerificationPrompt,
  resultadoSinVerificar,
} from '@/lib/activity-verification'
import type { Activity, ActivityCompletionResult, CurrentActivityContext } from '@/types/lesson'

// ── Fixture ────────────────────────────────────────────────────────────────

const CRITICO = 'ventilar para evacuar los gases'
const actividad: Activity = {
  id: 'a1',
  type: 'practice',
  keyPointIndex: 0,
  teaching: { agent_instruction: 'Presenta un escenario de ingreso a una labor recién disparada.' },
  verification: {
    question: 'Te describo la situación: entras a una labor recién disparada. ¿Qué haces antes de avanzar?',
    success_criteria: {
      must_include: [CRITICO, 'desatar las rocas sueltas', 'revisar el sostenimiento'],
      critical: [1],
      min_completeness: 60,
      understanding_level: 'achieved',
    },
    max_attempts: 5,
    rubric: {
      beginning: 'Entro y avanzo.',
      developing: 'Miro que no caigan rocas.',
      achieved: 'Ventilo, desato y reviso los pernos.',
      outstanding: 'Ventilo porque quedan gases, desato y reviso el sostenimiento antes de entrar.',
    },
  },
  commonMistakes: ['avanzar sin ventilar'],
}

const siguiente: Activity = {
  ...actividad,
  id: 'a2',
  type: 'explanation',
  verification: {
    question: '¿Cuál es la secuencia del ciclo de minado?',
    success_criteria: { must_include: ['perforación', 'voladura'] },
  },
}

function contexto(o: Partial<CurrentActivityContext> = {}): CurrentActivityContext {
  return {
    activity: actividad,
    activityIdx: 1,
    totalActivities: 4,
    isFirstActivity: false,
    isLastActivity: false,
    lessonTitle: 'Ciclo de minado',
    lessonObjective: 'Identificar las 5 fases del ciclo',
    lessonKeyPoints: ['Perforación', 'Voladura'],
    courseInstructor: 'Eres Sophia, instructora de minería.',
    ...o,
  }
}

function veredicto(o: Partial<ActivityCompletionResult> = {}): ActivityCompletionResult {
  return {
    completed: false,
    criteriaMatched: [CRITICO],
    criteriaMissing: ['desatar las rocas sueltas', 'revisar el sostenimiento'],
    completeness_percentage: 33,
    understanding_level: 'developing',
    response_type: 'partial',
    feedback: '',
    confidence: 'high',
    ready_to_advance: false,
    student_intent: 'answer',
    ...o,
  }
}

type Prompt = ReturnType<typeof buildSystemPrompt>
const estatico = (r: Prompt) => r.staticBlocks.map((b) => b.text).join('\n')
const completo = (r: Prompt) => `${estatico(r)}\n${r.dynamicPrompt}`

/** Todos los estados por los que pasa una actividad. */
const escenarios: Record<string, Prompt> = {
  inicio: buildSystemPrompt({ activityContext: contexto(), recentMessages: [] }),
  parcial_1: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto() }),
  parcial_2: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 2, verificationResult: veredicto() }),
  parcial_3: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 3, verificationResult: veredicto() }),
  parcial_4: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 4, verificationResult: veredicto() }),
  parcial_5: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 5, verificationResult: veredicto() }),
  incorrecta: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto({ response_type: 'incorrect', criteriaMatched: [] }) }),
  fuera_de_tema: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto({ response_type: 'off_topic' }) }),
  desglose: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto({ needs_scaffolding: true, next_subquestion: '¿Qué queda en el aire después del disparo?' }) }),
  correcta_transicion: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto({ completed: true, ready_to_advance: true, response_type: 'correct', criteriaMatched: actividad.verification.success_criteria.must_include, criteriaMissing: [] }), nextActivity: siguiente }),
  ultima: buildSystemPrompt({ activityContext: contexto({ isLastActivity: true }), recentMessages: [], attempts: 1, verificationResult: veredicto({ completed: true, ready_to_advance: true, response_type: 'correct' }) }),
  no_sabe: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 0, verificationResult: veredicto({ student_intent: 'does_not_know', criteriaMatched: [], response_type: 'incorrect' }) }),
  no_sabe_ya_explicado: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, wasExplained: true, verificationResult: veredicto({ student_intent: 'does_not_know', criteriaMatched: [], response_type: 'incorrect' }) }),
  pide_ayuda: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: veredicto({ student_intent: 'asks_for_help' }) }),
  sin_verificar: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], attempts: 1, verificationResult: resultadoSinVerificar(), nextActivity: siguiente }),
  tangentes: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], tangentCount: 3, intentClassification: { intent: 'off_topic', question_type: null, is_on_topic: false, relevance_score: 10, topic_mentioned: 'fútbol', needs_redirect: true, suggested_response_strategy: 'brief_redirect' } }),
  abierta: buildSystemPrompt({ activityContext: contexto({ activity: { ...actividad, type: 'reflection', verification: { ...actividad.verification, open_ended: true } } }), recentMessages: [], attempts: 1, verificationResult: veredicto() }),
  cierre: buildSystemPrompt({ activityContext: contexto({ activity: { ...actividad, type: 'closing' }, isLastActivity: true }), recentMessages: [] }),
  explicacion: buildSystemPrompt({ activityContext: contexto({ activity: siguiente }), recentMessages: [] }),
  no_evaluativa: buildSystemPrompt({ activityContext: contexto({ activity: { ...actividad, verification: { ...actividad.verification, is_evaluative: false } } }), recentMessages: [] }),
  code: buildSystemPrompt({ activityContext: contexto(), recentMessages: [], methodology: 'CODE', projectBrief: { app: 'inventario' } }),
}

// ── Voseo ──────────────────────────────────────────────────────────────────

// Solo formas con la vocal acentuada final (el «vos» rioplatense). «Explica»
// es tuteo y no entra; «explicá» sí. \b no funciona con letras acentuadas en
// JS, por eso los lookarounds con \p{L}.
const VOSEO = /(?<!\p{L})(hacé|cerrá|explicá|usá|reconocé|empezá|armá|reformulá|abrí|enseñá|parafraseá|guiá|contá|elegí|tolerá|devolvé|devolvés|comparás|dejá|podés|tenés|querés|mirá|fijate|imaginá|agradecé|cuestioná|procedé|mencioná|descomponé|interpretala|decí|pensá|escribí|respondé|preguntá|avanzá|validá|repetí|mostrá|sabés|entendés|acordate|contestá|hacelo|decile)(?!\p{L})/iu

/** La regla que prohíbe el voseo lista las formas prohibidas: se excluye. */
function sinLaReglaDelVoseo(texto: string): string {
  return texto
    .split('\n')
    .filter((l) => !l.includes('PROHIBIDO el voseo'))
    .join('\n')
}

test('el prompt del tutor no conjuga en voseo en ningún estado', () => {
  for (const [nombre, p] of Object.entries(escenarios)) {
    const m = sinLaReglaDelVoseo(completo(p)).match(VOSEO)
    assert.equal(m, null, `voseo en el escenario «${nombre}»: «${m?.[0]}»`)
  }
})

// ── Contradicciones ────────────────────────────────────────────────────────

test('ninguna etapa de pistas ofrece opciones ni pide confirmación', () => {
  for (const [nombre, p] of Object.entries(escenarios)) {
    const d = p.dynamicPrompt
    assert.doesNotMatch(d, /¿Es (tipo )?A o (tipo )?B\?/, `«¿Es A o B?» en «${nombre}»`)
    assert.doesNotMatch(d, /Da opciones/i, `«Da opciones» en «${nombre}»`)
    assert.doesNotMatch(d, /"¿Queda claro\?"|"¿Tiene sentido\?"/i, `confirmación disfrazada en «${nombre}»`)
    assert.doesNotMatch(d, /DA LA RESPUESTA Y AVANZA|Da la respuesta completa/i, `entrega la respuesta en «${nombre}»`)
  }
})

test('el bloque estático no invita a profundizar cuando ya cumplió los criterios', () => {
  const e = estatico(escenarios.inicio)
  assert.doesNotMatch(e, /puedes profundizar/i)
  assert.doesNotMatch(e, /¿Es tipo A o tipo B\?/)
  assert.doesNotMatch(e, /NO corrijas directamente/i)
})

test('un solo umbral de completitud por defecto', () => {
  const sinUmbral = buildSystemPrompt({
    activityContext: contexto({ activity: siguiente }),
    recentMessages: [],
  })
  assert.match(estatico(sinUmbral), /Umbral de aprobación: 50%/)
})

// ── Eliminatorios ──────────────────────────────────────────────────────────

test('los criterios eliminatorios se declaran y nunca se explican', () => {
  const e = estatico(escenarios.inicio)
  assert.match(e, /CRITERIOS ELIMINATORIOS/)
  assert.ok(e.includes(CRITICO))

  for (const nombre of ['parcial_3', 'parcial_4', 'parcial_5'] as const) {
    assert.match(escenarios[nombre].dynamicPrompt, /EXCEPTO los criterios eliminatorios/, `sin excepción en «${nombre}»`)
  }

  // La mini-explicación enseña los conceptos base, no el eliminatorio.
  const d = escenarios.no_sabe.dynamicPrompt
  assert.match(d, /ENSEÑA ANTES DE PREGUNTAR/)
  assert.ok(d.includes('desatar las rocas sueltas'))
  const bloqueConceptos = d.slice(d.indexOf('CONCEPTOS QUE SE ESPERABAN'), d.indexOf('CÓMO RESPONDER'))
  assert.ok(!bloqueConceptos.includes(CRITICO), 'la mini-explicación revela el criterio eliminatorio')
})

test('agotar los intentos cierra sin dar la actividad por lograda', () => {
  const d = escenarios.parcial_5.dynamicPrompt
  assert.match(d, /ÚLTIMO INTENTO/)
  assert.match(d, /quedó pendiente/)
})

// ── Intención del alumno: la decide el verificador ─────────────────────────

test('sin veredicto del verificador no hay modo «no sé»', () => {
  assert.doesNotMatch(escenarios.inicio.dynamicPrompt, /NO SÉ|NO TIENE BASE/)
  assert.match(escenarios.pide_ayuda.dynamicPrompt, /DESCOMPÓN SIN REVELAR/)
  assert.match(escenarios.no_sabe_ya_explicado.dynamicPrompt, /Ya le explicaste antes/)
})

// ── Verificador caído ──────────────────────────────────────────────────────

test('con el verificador caído Sophia no califica la respuesta', () => {
  const d = escenarios.sin_verificar.dynamicPrompt
  assert.match(d, /NO PUDO VERIFICARSE/)
  assert.doesNotMatch(d, /"Correcto\/Bien\."/)
  const r = resultadoSinVerificar()
  assert.equal(r.unverified, true)
  assert.equal(r.ready_to_advance, true)
  assert.equal(r.criteriaMatched.length, 0)
})

// ── Prompts del verificador ────────────────────────────────────────────────

const historial = [{ role: 'assistant' as const, content: 'Entras a la labor. ¿Qué haces antes de avanzar?' }]
const promptsVerificador: Record<string, string> = {
  abierta: buildOpenEndedVerificationPrompt('instr', actividad, 'Ventilo primero', historial, '', 'achieved'),
  estandar: buildStandardVerificationPrompt('instr', actividad, 'Ventilo primero', historial, actividad.verification.success_criteria, '', 60, 'achieved'),
  rubrica: buildRubricVerificationPrompt(actividad, 'Ventilo primero', historial, actividad.verification.rubric!, actividad.verification.success_criteria.must_include, 60, 'achieved', true),
}

test('el verificador pide criterios e intención, no niveles de la escala vieja', () => {
  for (const [nombre, p] of Object.entries(promptsVerificador)) {
    assert.match(p, /"student_intent"/, `sin student_intent en «${nombre}»`)
    assert.doesNotMatch(p, /"memorized"|"understood"|"applied"|"analyzed"/, `escala vieja en «${nombre}»`)
    assert.doesNotMatch(p, /Contá los criterios/, `«Contá» en «${nombre}»`)
    const m = p.match(VOSEO)
    assert.equal(m, null, `voseo en el prompt «${nombre}»: «${m?.[0]}»`)
  }
  assert.match(promptsVerificador.estandar, /NO clasifiques el nivel/)
  assert.match(promptsVerificador.abierta, /NO clasifiques el nivel/)
})
