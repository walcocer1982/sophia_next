/**
 * Reglas del Monitor (lib/monitor.ts): el estado sale de la ventana de la
 * sesión, una alerta se atiende con una marca posterior, y el cuello de
 * botella se mide sobre los que llegaron.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  atendido,
  avisoDeIntentos,
  cierreDeVentana,
  estadoDeSesion,
  pasoDelEmbudo,
  representativa,
  type SesionDeEmbudo,
} from '@/lib/monitor'

const h = (n: number) => n * 3_600_000
const ahora = new Date('2026-10-15T15:00:00Z')
const hace = (horas: number) => new Date(ahora.getTime() - h(horas))

test('cierreDeVentana: sin horario no hay ventana', () => {
  assert.equal(cierreDeVentana(null, 3), null)
  assert.equal(cierreDeVentana('2026-10-15T01:00:00Z', 2)?.toISOString(), '2026-10-15T03:00:00.000Z')
})

test('estadoDeSesion: con la ventana abierta, quieto es «en pausa», no abandonó', () => {
  const cierre = new Date(ahora.getTime() + h(5))
  const base = { completedAt: null, completadas: 1 }
  assert.equal(estadoDeSesion({ ...base, lastActivityAt: hace(0.5) }, cierre, ahora).estado, 'activa')
  const pausa = estadoDeSesion({ ...base, lastActivityAt: hace(30) }, cierre, ahora)
  assert.equal(pausa.estado, 'en-pausa')
  assert.equal(pausa.cerrada, false)
})

test('estadoDeSesion: con la ventana cerrada queda «sin terminar», a medias o sin avanzar', () => {
  const cierre = hace(1)
  const aMedias = estadoDeSesion({ completedAt: null, lastActivityAt: hace(0.2), completadas: 2 }, cierre, ahora)
  assert.equal(aMedias.estado, 'sin-terminar')
  assert.equal(aMedias.avance, 'a-medias')
  const sinAvanzar = estadoDeSesion({ completedAt: null, lastActivityAt: hace(3), completadas: 0 }, cierre, ahora)
  assert.equal(sinAvanzar.avance, 'sin-avanzar')
})

test('estadoDeSesion: sin ventana, solo 24 h de silencio la cierran', () => {
  assert.equal(estadoDeSesion({ completedAt: null, lastActivityAt: hace(20), completadas: 1 }, null, ahora).estado, 'en-pausa')
  assert.equal(estadoDeSesion({ completedAt: null, lastActivityAt: hace(30), completadas: 1 }, null, ahora).estado, 'sin-terminar')
})

test('estadoDeSesion: terminada manda sobre todo', () => {
  const r = estadoDeSesion({ completedAt: hace(50), lastActivityAt: hace(50), completadas: 5 }, hace(40), ahora)
  assert.equal(r.estado, 'terminada')
  assert.equal(r.avance, null)
})

test('representativa: gana la que terminó; si ninguna, la más reciente', () => {
  const a = { id: 'a', completedAt: null, startedAt: hace(10) }
  const b = { id: 'b', completedAt: null, startedAt: hace(2) }
  const c = { id: 'c', completedAt: hace(5), startedAt: hace(6) }
  assert.equal(representativa([a, b])?.id, 'b')
  assert.equal(representativa([b, c, a])?.id, 'c')
  assert.equal(representativa([]), null)
})

test('atendido: una marca posterior al evento lo cubre; desertó cubre todo', () => {
  const evento = hace(10)
  assert.equal(atendido(null, evento), false)
  assert.equal(atendido({ estado: 'NO_RESPONDE', fecha: hace(20) }, evento), false)
  assert.equal(atendido({ estado: 'NO_RESPONDE', fecha: hace(5) }, evento), true)
  assert.equal(atendido({ estado: 'DESERTO', fecha: hace(200) }, evento), true)
})

test('avisoDeIntentos: avisa a uno del tope, que es cuando aún se puede intervenir', () => {
  assert.equal(avisoDeIntentos(0, 3), false)
  assert.equal(avisoDeIntentos(1, 3), false)
  assert.equal(avisoDeIntentos(2, 3), true)
  assert.equal(avisoDeIntentos(3, 3), true)
  assert.equal(avisoDeIntentos(1, 1), true)
})

const sesion = (
  userId: string,
  punteroIdx: number,
  progresos: Record<string, Partial<SesionDeEmbudo['progresos'] extends Map<string, infer P> ? P : never>>,
  completedAt: Date | null = null
): SesionDeEmbudo => ({
  userId,
  completedAt,
  punteroIdx,
  progresos: new Map(
    Object.entries(progresos).map(([k, p]) => [
      k,
      { status: 'IN_PROGRESS', attempts: 1, passedCriteria: null, nivel: null, faltantes: [], ...p },
    ])
  ),
})

test('pasoDelEmbudo: a mitad de clase, la actividad a la que nadie llegó no es cuello de botella', () => {
  const sesiones = [
    sesion('u1', 1, { a1: { status: 'COMPLETED', passedCriteria: true } }),
    sesion('u2', 1, { a1: { status: 'COMPLETED', passedCriteria: true } }),
    sesion('u3', 0, { a1: {} }),
  ]
  const a3 = pasoDelEmbudo(2, 'a3', sesiones)
  assert.equal(a3.llegaron, 0)
  assert.equal(a3.cuelloDeBotella, false)
  const a1 = pasoDelEmbudo(0, 'a1', sesiones)
  assert.equal(a1.llegaron, 3)
  assert.equal(a1.completadas, 2)
  assert.equal(a1.cuelloDeBotella, false)
})

test('pasoDelEmbudo: avanzar por límite no cuenta como superada', () => {
  const sesiones = [
    sesion('u1', 2, { a2: { status: 'COMPLETED', passedCriteria: false, attempts: 3 } }),
    sesion('u2', 2, { a2: { status: 'COMPLETED', passedCriteria: false, attempts: 3 } }),
    sesion('u3', 2, { a2: { status: 'COMPLETED', passedCriteria: true, attempts: 1 } }),
  ]
  const paso = pasoDelEmbudo(1, 'a2', sesiones)
  assert.equal(paso.llegaron, 3)
  assert.equal(paso.completadas, 3)
  assert.equal(paso.porLimite, 2)
  assert.equal(paso.cuelloDeBotella, true)
  assert.equal(paso.promedioIntentos, 2.3)
})

test('pasoDelEmbudo: el criterio más fallado cuenta alumnos, no intentos', () => {
  const sesiones = [
    sesion('u1', 0, { a1: { faltantes: ['razón', 'razón', 'razón'] } }),
    sesion('u2', 0, { a1: { faltantes: ['dato'] } }),
    sesion('u3', 0, { a1: { faltantes: ['dato'] } }),
  ]
  assert.equal(pasoDelEmbudo(0, 'a1', sesiones).criterioMasFallado, 'dato')
})

test('pasoDelEmbudo: con menos de tres que llegaron no se habla de cuello', () => {
  const sesiones = [sesion('u1', 0, { a1: { status: 'COMPLETED', passedCriteria: false } })]
  assert.equal(pasoDelEmbudo(0, 'a1', sesiones).cuelloDeBotella, false)
})
