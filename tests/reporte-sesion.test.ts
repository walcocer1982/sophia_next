/**
 * Reporte por alumno y por sesión (lib/reporte-sesion.ts), con una sesión
 * como la S1 de SI-ALTORIESGO: rutina sin nota, cuatro puntos clave con línea
 * que respalda, caso corto y cierre.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reporteDeSesion, type ProgresoReporte } from '@/lib/reporte-sesion'
import type { Activity, TextBlock } from '@/types/lesson'

const norma = (id: string): TextBlock => ({ id, type: 'text', title: `Norma ${id}`, body: '- a\n- b\n- c', subrayable: true, lineasClave: [2] })

function act(id: string, n: number, opts: { tipo?: Activity['type']; kp: number | null; criterios?: string[]; critical?: number[]; sinNota?: boolean; conNorma?: boolean }): Activity {
  return {
    id,
    type: opts.tipo ?? 'practice',
    title: `Actividad ${n}`,
    keyPointIndex: opts.kp,
    teaching: { agent_instruction: '', blocks: opts.conNorma ? [norma(`n${n}`)] : [] },
    verification: {
      question: `¿${n}?`,
      success_criteria: { must_include: opts.criterios ?? [], critical: opts.critical },
      max_attempts: opts.sinNota ? 1 : 2,
      is_evaluative: !opts.sinNota,
    },
  } as Activity
}

const C4 = ['Decide que sí es trabajo en altura', 'Da la razón: electricidad activa a cualquier altura']
const C5 = ['Decide: en la embotelladora sí y en la mina no', 'Concluye que el umbral depende del rubro']
const C6 = ['Decide que sí es un borde sin protección', 'Da la razón: la baranda debe medir 1,0 m']
const C7 = ['Identifica a quien pasa por la puerta', 'Da la razón: el balde cae sobre quien está abajo']
const C8 = ['Decide que sí: OSHA 1910 desde 1,20 m', 'Nombra el peligro: borde sin baranda', 'Sigue la caída hasta el montacargas']

const actividades: Activity[] = [
  act('a1', 1, { tipo: 'reflection', kp: null, sinNota: true }),
  act('a2', 2, { tipo: 'reflection', kp: null, sinNota: true }),
  act('a3', 3, { tipo: 'reflection', kp: null, sinNota: true }),
  act('a4', 4, { kp: 0, criterios: C4, critical: [2], conNorma: true }),
  act('a5', 5, { kp: 0, criterios: C5, critical: [1], conNorma: true }),
  act('a6', 6, { kp: 1, criterios: C6, critical: [2], conNorma: true }),
  act('a7', 7, { kp: 2, criterios: C7, critical: [2], conNorma: true }),
  act('a8', 8, { kp: 0, criterios: C8, critical: [1] }),
  act('a9', 9, { tipo: 'closing', kp: null, sinNota: true }),
]
const keyPoints = ['Cuándo una tarea es trabajo en altura', 'Peligros de caída', 'Caída de personas y de objetos']

const intento = (nivel: string, pct: number, matched: string[], missing: string[], texto: string) => ({
  studentResponse: texto,
  analysis: { understanding_level: nivel, completeness_percentage: pct, criteriaMatched: matched, criteriaMissing: missing, ready_to_advance: pct >= 50, completed: pct >= 50 },
})
const hecha = (activityId: string, attempts: number, evidence: Record<string, unknown>, passed = true): ProgresoReporte => ({
  activityId,
  status: 'COMPLETED',
  attempts,
  passedCriteria: passed,
  evidenceData: evidence,
})

const brayan: ProgresoReporte[] = [
  hecha('a1', 1, { attempts: [intento('achieved', 100, [], [], 'Veo una losa con fierro.')] }),
  hecha('a2', 1, { attempts: [intento('achieved', 100, [], [], 'Del borde, no hay baranda.')] }),
  hecha('a3', 1, { attempts: [intento('achieved', 100, [], [], 'Abajo está el otro piso.')] }),
  hecha('a4', 1, { attempts: [intento('achieved', 100, C4, [], 'Sí: hay electricidad activa debajo y la G.050 pide protección a cualquier altura.')], lecturaNoComprobada: false }),
  hecha('a5', 2, {
    attempts: [
      intento('developing', 50, [C5[1]], [C5[0]], 'En la mina, por el decreto.'),
      intento('developing', 50, [C5[1]], [C5[0]], 'En la concentradora sí, porque es minería y rige desde 1 m 80.'),
    ],
    lecturaNoComprobada: true,
  }, false),
  hecha('a6', 1, { attempts: [intento('achieved', 100, C6, [], 'Sí: la baranda debe medir 1,0 m y esa tiene 60 cm.')], lecturaNoComprobada: false }),
  hecha('a7', 1, { attempts: [intento('outstanding', 100, C7, [], 'El que entra por la puerta; además nadie debajo del área.')], lecturaNoComprobada: true }),
  hecha('a8', 2, { attempts: [intento('developing', 33, [C8[1]], [C8[0], C8[2]], 'Sí, por el borde.'), intento('achieved', 100, C8, [], 'Sí: OSHA 1910 desde 1,20 m; el borde sin baranda; cae al montacargas.')] }),
  hecha('a9', 1, { attempts: [intento('achieved', 100, [], [], '¿Qué norma manda en una fábrica en el Perú?')] }),
]

test('avance, logro por punto clave y dominio de criterios de una sesión terminada', () => {
  const r = reporteDeSesion({ actividades, keyPoints, progresos: brayan, terminada: true, cerrada: true })
  assert.deepEqual({ hechas: r.avance.hechas, total: r.avance.total, conNota: r.avance.conNota, conNotaHechas: r.avance.conNotaHechas }, { hechas: 9, total: 9, conNota: 5, conNotaHechas: 5 })
  assert.equal(r.puntosClave.length, 3)
  assert.deepEqual(r.puntosClave.map((k) => k.nivel), ['en_inicio', 'logrado', 'logrado_destacado'])
  assert.deepEqual(r.puntosClave.map((k) => k.actividades.map((a) => a.indice)), [[4, 5, 8], [6], [7]])
  assert.equal(r.logro.puntosLogrados, 2)
  assert.equal(r.logro.porcentaje, 67)
  assert.equal(r.logro.criteriosTotal, 11)
  assert.equal(r.logro.criteriosCubiertos, 10)
  assert.deepEqual([r.logro.lecturasComprobadas, r.logro.lecturasTotal], [2, 4])
  // La nota es la de siempre (lib/grading.ts): 62,5 · 12,5 (eliminatorio nunca cubierto) · 62,5 · 87,5 · 59 (logrado al 2.º) sobre 5
  assert.equal(r.logro.nota, 57)
  assert.equal(r.logro.nivelSesion, 'logrado')
  assert.equal(r.logro.notaVeinte, 11.4)
  assert.equal(r.logro.parcial, false)
})

test('fortalezas, oportunidades, duda y acciones salen de la evidencia', () => {
  const r = reporteDeSesion({ actividades, keyPoints, progresos: brayan, terminada: true, cerrada: true })
  assert.deepEqual(r.fortalezas.map((f) => f.actividad.indice), [4, 6, 7, 8])
  assert.ok(r.fortalezas[0].texto.includes('a la primera') && r.fortalezas[0].texto.includes('señala la línea'))
  assert.ok(r.fortalezas[2].texto.startsWith('va más allá'))
  assert.ok(r.fortalezas[3].texto.includes('2 turnos'))
  assert.deepEqual(r.oportunidades.map((o) => [o.actividad.indice, o.tipo]), [[5, 'criterio'], [7, 'lectura']])
  assert.deepEqual(r.oportunidades[0].falta, [C5[0]])
  assert.equal(r.oportunidades[0].actividad.respuesta, 'En la concentradora sí, porque es minería y rige desde 1 m 80.')
  assert.equal(r.duda, '¿Qué norma manda en una fábrica en el Perú?')
  assert.equal(r.acciones.length, 3)
  assert.ok(r.acciones[0].startsWith('Reforzar «Cuándo una tarea es trabajo en altura»: Decide'))
  assert.ok(r.acciones[1].includes('«Norma n7»'))
  assert.ok(r.acciones[2].startsWith('Responder su duda'))
})

test('la cita de una fortaleza es lo que el alumno escribió, no el turno de tocar la línea', () => {
  const mensajes = [
    { activityId: 'a4', content: 'Sí es trabajo en altura: hay electricidad activa debajo.' },
    { activityId: 'a4', content: 'la línea tres' },
    { activityId: 'a5', content: 'listo' },
    { activityId: 'a5', content: 'En la mina, por el decreto.' },
  ]
  const r = reporteDeSesion({ actividades, keyPoints, progresos: brayan, terminada: true, cerrada: true, mensajes })
  assert.equal(r.fortalezas[0].cita, 'Sí es trabajo en altura: hay electricidad activa debajo.')
  assert.equal(r.actividades[4].cita, 'En la mina, por el decreto.')
  // Sin mensajes, cae a la evidencia.
  assert.equal(r.actividades[5].cita, 'Sí: la baranda debe medir 1,0 m y esa tiene 60 cm.')
})

test('sesión a medias con la ventana cerrada: lo que no llegó es una oportunidad; nota parcial', () => {
  const aMedias = brayan.slice(0, 5) // hasta la actividad 5
  const r = reporteDeSesion({ actividades, keyPoints, progresos: aMedias, terminada: false, cerrada: true })
  assert.equal(r.avance.hechas, 5)
  assert.deepEqual(r.puntosClave.map((k) => [k.nivel, k.completo]), [['en_inicio', false], [null, false], [null, false]])
  assert.equal(r.logro.puntosLogrados, 0)
  assert.equal(r.logro.parcial, true)
  assert.deepEqual(r.oportunidades.filter((o) => o.tipo === 'sin_llegar').map((o) => o.actividad.indice), [6, 7, 8])
  assert.ok(r.acciones.some((a) => a.startsWith('Revisar con él lo que no alcanzó')))
  assert.equal(r.duda, null)
})

test('sesión en curso con la ventana abierta: no se reclama lo pendiente', () => {
  const enCurso: ProgresoReporte[] = [...brayan.slice(0, 4), { activityId: 'a5', status: 'IN_PROGRESS', attempts: 1, passedCriteria: false, evidenceData: { attempts: [intento('developing', 50, [C5[1]], [C5[0]], 'En la mina.')] } }]
  const r = reporteDeSesion({ actividades, keyPoints, progresos: enCurso, terminada: false, cerrada: false })
  assert.equal(r.actividades[4].estado, 'en_curso')
  assert.equal(r.actividades[4].nivel, null)
  assert.equal(r.oportunidades.length, 0)
  assert.equal(r.logro.nota !== null, true)
})
