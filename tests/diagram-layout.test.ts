import { test } from 'node:test'
import assert from 'node:assert/strict'
import { layoutDiagram, wrapText } from '../lib/diagram-layout'
import type { DiagramBlock } from '../types/lesson'

const pasos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}`, label: `Paso ${i + 1}: verificar energía cero intentando arrancar el equipo` }))

const flujo = (kind: DiagramBlock['kind'], n = 6, extra: Partial<DiagramBlock> = {}): DiagramBlock => ({
  id: 'd', type: 'diagram', title: 'Bloqueo y etiquetado', kind, nodes: pasos(n), ...extra,
})

const seSolapan = (a: { y: number; h: number; x: number; w: number }, b: { y: number; h: number; x: number; w: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

for (const kind of ['flow', 'cycle', 'hierarchy', 'timeline'] as const) {
  test(`${kind}: seis pasos caben en 280 px sin cajas encimadas`, () => {
    const l = layoutDiagram(flujo(kind, 6, kind === 'hierarchy' ? { parent: { n2: 'n1', n3: 'n1', n4: 'n2', n5: 'n2', n6: 'n3' } } : {}), 280)
    assert.equal(l.boxes.length, 6)
    for (const b of l.boxes) {
      assert.ok(b.x >= 0 && b.x + b.w <= 280, `${b.id} se sale del ancho`)
      assert.ok(b.y + b.h <= l.height + 1, `${b.id} se sale del alto`)
    }
    for (let i = 0; i < l.boxes.length; i++)
      for (let j = i + 1; j < l.boxes.length; j++) assert.ok(!seSolapan(l.boxes[i], l.boxes[j]), `${i} y ${j} se encima`)
  })
}

test('el flujo dibuja una flecha entre pasos y el ciclo una más de retorno', () => {
  assert.equal(layoutDiagram(flujo('flow'), 300).arrows.length, 5)
  assert.equal(layoutDiagram(flujo('cycle'), 300).arrows.length, 6)
})

test('la jerarquía sangra por nivel y dibuja un conector por hijo', () => {
  const l = layoutDiagram(flujo('hierarchy', 4, { parent: { n2: 'n1', n3: 'n1', n4: 'n2' } }), 300)
  const x = Object.fromEntries(l.boxes.map((b) => [b.id, b.x]))
  assert.ok(x.n2 > x.n1 && x.n4 > x.n2 && x.n3 === x.n2)
  assert.equal(l.connectors.length, 3)
  // Orden de lectura: el hijo debajo de su padre
  assert.deepEqual(l.boxes.map((b) => b.id), ['n1', 'n2', 'n4', 'n3'])
})

test('un ciclo de padres mal cargado no cuelga ni pierde nodos', () => {
  const l = layoutDiagram(flujo('hierarchy', 3, { parent: { n1: 'n2', n2: 'n1' } }), 300)
  assert.equal(l.boxes.length, 3)
})

test('el texto largo se parte en líneas que entran en la caja', () => {
  const lineas = wrapText('Colocar candado y tarjeta con nombre del trabajador responsable', 120)
  assert.ok(lineas.length > 1)
  assert.ok(lineas.every((l) => l.length <= Math.floor(120 / (13 * 0.56))))
})

test('Sophia recibe la jerarquía como relaciones, y el flujo con la etiqueta de la flecha', async () => {
  const { serializeBlockForPrompt } = await import('../lib/support-blocks')
  const j = serializeBlockForPrompt({ id: 'j', type: 'diagram', title: 'Tipos', kind: 'hierarchy', nodes: [{ id: 'a', label: 'EPP' }, { id: 'b', label: 'Básico' }, { id: 'c', label: 'Específico' }], parent: { b: 'a', c: 'a' } })
  assert.match(j, /Primer nivel: EPP/)
  assert.match(j, /EPP > Básico; EPP > Específico/)
  const f = serializeBlockForPrompt({ id: 'f', type: 'diagram', title: 'LOTO', kind: 'flow', nodes: [{ id: 'n1', label: 'Verificar' }, { id: 'n2', label: 'Intervenir' }], edges: [{ from: 'n1', to: 'n2', label: 'si no arranca' }] })
  assert.match(f, /Verificar \(si no arranca\) → Intervenir/)
})
