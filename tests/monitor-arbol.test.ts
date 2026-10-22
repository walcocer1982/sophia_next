/**
 * El árbol del Monitor (lib/monitor-arbol.ts): admisión ▸ sede ▸ carrera, con
 * la regla de Programación para saber qué curso sirve a qué carrera.
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armarArbol, claveGrupo, enlaceRama, ramaDe, seleccionDe, unicaRama, type SeccionDelArbol } from '@/lib/monitor-arbol'

const SI = { id: 'si', name: 'Seguridad Industrial', code: 'SI' }
const PM = { id: 'pm', name: 'Procesos Metalúrgicos', code: 'PM' }
const EOM = { id: 'eom', name: 'Explotación de Minas', code: 'EOM' }

const p262 = { id: 'p2', name: '2026-2', isActive: true }
const p261 = { id: 'p1', name: '2026-1', isActive: false }
const abq = { id: 'abq', code: 'ABQ', careers: [SI, PM, EOM] }
const fchb = { id: 'fchb', code: 'FCHB', careers: [EOM] }

const altoRiesgo = { id: 'c-ar', title: 'Trabajos de alto riesgo', scope: 'SPECIALIZATION', careers: [SI] }
const tutoria = { id: 'c-tu', title: 'Plan de Tutoría', scope: 'TRANSVERSAL', careers: [] }

const secciones: SeccionDelArbol[] = [
  { id: 's1', name: 'SI 1', alumnos: 13, period: p262, sede: abq, course: altoRiesgo },
  { id: 's2', name: 'Práctica (simulados)', alumnos: 3, period: p262, sede: abq, course: altoRiesgo },
  { id: 's3', name: 'PM 1', alumnos: 20, period: p262, sede: abq, course: tutoria },
  { id: 's4', name: 'A', alumnos: 30, period: p261, sede: fchb, course: tutoria },
  { id: 's5', name: 'Vieja', alumnos: 5, period: p261, sede: null, course: altoRiesgo },
]

test('agrupa admisión ▸ sede ▸ carrera y el transversal cuelga de todas las carreras de la sede', () => {
  const arbol = armarArbol(secciones)
  assert.deepEqual(arbol.map((a) => a.name), ['2026-2', '2026-1']) // la más nueva arriba
  const [a262, a261] = arbol
  assert.deepEqual(a262.sedes.map((s) => s.code), ['ABQ'])
  const abqNodo = a262.sedes[0]
  assert.deepEqual(abqNodo.carreras.map((c) => c.code), ['EOM', 'PM', 'SI'])
  // SI: alto riesgo (dos secciones) + tutoría (transversal); EOM: solo tutoría
  assert.deepEqual(abqNodo.carreras.find((c) => c.id === 'si')!.secciones.map((s) => s.id), ['s1', 's2', 's3'])
  assert.deepEqual(abqNodo.carreras.find((c) => c.id === 'eom')!.secciones.map((s) => s.id), ['s3'])
  assert.equal(abqNodo.alumnos, 36)
  // 2026-1: FCHB con EOM (tutoría) y «Sin sede» con SI (alto riesgo)
  assert.deepEqual(a261.sedes.map((s) => s.code), ['FCHB', 'Sin sede'])
  assert.deepEqual(a261.sedes[1].carreras.map((c) => c.id), ['si'])
})

test('los «necesitan atención» se suman por grupo (curso, admisión, sede) sin repetir secciones', () => {
  const enRiesgo = new Map([
    [claveGrupo(secciones[0]), 4], // alto riesgo · 2026-2 · ABQ (SI 1 + Práctica juntas)
    [claveGrupo(secciones[2]), 9], // tutoría · 2026-2 · ABQ
  ])
  const arbol = armarArbol(secciones, enRiesgo)
  const abqNodo = arbol[0].sedes[0]
  assert.equal(abqNodo.enRiesgo, 13)
  assert.equal(abqNodo.carreras.find((c) => c.id === 'si')!.enRiesgo, 13)
  assert.equal(abqNodo.carreras.find((c) => c.id === 'pm')!.enRiesgo, 9)
  assert.equal(arbol[0].enRiesgo, 13)
  assert.equal(arbol[1].enRiesgo, 0)
})

test('selección por parámetros, enlace de la rama y rama única', () => {
  const sel = seleccionDe({ admision: 'p2', sede: 'abq', carrera: 'si', otro: 'x' })
  assert.deepEqual(sel, { admision: 'p2', sede: 'abq', carrera: 'si' })
  assert.equal(enlaceRama(sel), '/dashboard?admision=p2&sede=abq&carrera=si')
  assert.equal(enlaceRama({ admision: null, sede: null, carrera: null }), '/dashboard')

  const arbol = armarArbol(secciones)
  const rama = ramaDe(arbol, sel)
  assert.equal(rama?.carrera.name, 'Seguridad Industrial')
  assert.equal(ramaDe(arbol, { admision: 'p2', sede: 'abq', carrera: 'nada' }), null)
  assert.equal(unicaRama(arbol), null)

  // El instructor con una sola carrera entra directo.
  const solo = armarArbol([secciones[0]])
  assert.deepEqual(unicaRama(solo), { admision: 'p2', sede: 'abq', carrera: 'si' })
})
