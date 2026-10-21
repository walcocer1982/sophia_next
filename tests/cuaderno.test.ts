import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparPorActividad, partirEnOraciones, separarPedido } from '../lib/cuaderno'

const orden = ['a1', 'a2', 'a3']

test('agrupa por actividad en el orden de la lección; la bienvenida sin actividad va con lo que sigue', () => {
  const msgs = [
    { id: 'w', activityId: null },
    { id: 'u1', activityId: 'a1' },
    { id: 's1', activityId: 'a2' }, // transición: Sophia ya presenta la a2
    { id: 'u2', activityId: 'a2' },
  ]
  const g = agruparPorActividad(msgs, orden, 'a2')
  assert.deepEqual(g.map((s) => [s.actividadId, s.mensajes.map((m) => m.id)]), [['a1', ['w', 'u1']], ['a2', ['s1', 'u2']]])
})

test('sin ninguna actividad conocida, todo va a la actividad actual', () => {
  const g = agruparPorActividad([{ id: 'w', activityId: null }], orden, 'a3')
  assert.deepEqual(g.map((s) => s.actividadId), ['a3'])
})

test('separa el pedido final (pregunta o imperativo) del resto del mensaje', () => {
  assert.deepEqual(separarPedido('Bien, eso es correcto.\n\n¿Qué le pasa si falta otra vez?'), { cuerpo: 'Bien, eso es correcto.', pedido: '¿Qué le pasa si falta otra vez?' })
  assert.deepEqual(separarPedido('Exacto.\n\nBaja el TC2 a 0 y dime qué número ves.').pedido, 'Baja el TC2 a 0 y dime qué número ves.')
  assert.equal(separarPedido('Terminaste. Gracias por participar.').pedido, null)
})

test('en un párrafo largo destaca solo la oración final que pregunta (bienvenida del 14 oct)', () => {
  const r = separarPedido('Mira el caso de Luis. Luis terminó con 15 de promedio, pero figura con 00. Esta actividad no lleva nota. ¿Qué crees que pasó y qué dato del caso te lo dice?')
  assert.equal(r.pedido, '¿Qué crees que pasó y qué dato del caso te lo dice?')
  assert.equal(r.cuerpo, 'Mira el caso de Luis. Luis terminó con 15 de promedio, pero figura con 00. Esta actividad no lleva nota.')
  assert.equal(separarPedido('Bien. ¿Por qué esa? ¿Y qué pasa si falta otra vez?').pedido, '¿Por qué esa? ¿Y qué pasa si falta otra vez?')
})

test('las abreviaturas con punto no parten la pregunta (prueba del 19 oct: «D.S. 024»)', () => {
  const texto = 'Bien, captas que el umbral cambia según el rubro. Ahora apliquemos eso al caso concreto: si la plataforma mide 1,60 m, ¿en la concentradora de minerales (D.S. 024, desde 1,80 m) se alcanza ese umbral, y en la planta embotelladora (OSHA 1910, industria general, desde 1,20 m)?'
  const r = separarPedido(texto)
  assert.equal(r.cuerpo, 'Bien, captas que el umbral cambia según el rubro.')
  assert.ok(r.pedido?.startsWith('Ahora apliquemos') && r.pedido.includes('(D.S. 024, desde 1,80 m)'), r.pedido ?? 'sin pedido')
  assert.deepEqual(partirEnOraciones('Mide 1,80 m. Por eso protege. ¿Y si mide 1,50 m., p. ej. en una obra?'), [
    'Mide 1,80 m.',
    'Por eso protege.',
    '¿Y si mide 1,50 m., p. ej. en una obra?',
  ])
})

test('el primer párrafo que cierra la actividad anterior se separa del resto (19 oct)', async () => {
  const { separarCierreDeLaAnterior } = await import('../lib/cuaderno')
  const msg = 'Exacto. La baranda debe tener al menos 1,0 m de alto. Con 60 cm no alcanza.\n\nAhora vamos a distinguir entre peligro y riesgo.\n\nUn albañil levanta un muro: si cae un balde, ¿quién está en riesgo?'
  const r = separarCierreDeLaAnterior(msg)
  assert.equal(r.cierre, 'Exacto. La baranda debe tener al menos 1,0 m de alto. Con 60 cm no alcanza.')
  assert.ok(r.resto.startsWith('Ahora vamos'))
  // Si el primer párrafo ya pregunta, o es lo único que hay, no se separa
  assert.equal(separarCierreDeLaAnterior('¿Qué ves en la foto?\n\nMírala sin leer nada más.').cierre, null)
  assert.equal(separarCierreDeLaAnterior('Bien. ¿Por qué esa?').cierre, null)
  assert.equal(separarCierreDeLaAnterior('Elige una:\n\nA) Uno\nB) Dos').cierre, null)
})

test('las negritas con espacio antes del cierre se arreglan (20 oct)', async () => {
  const { arreglarNegritas } = await import('../lib/cuaderno')
  assert.equal(arreglarNegritas('De lo que señalaste: **¿Qué hay abajo de cada uno? ** — es decir'), 'De lo que señalaste: **¿Qué hay abajo de cada uno?** — es decir')
  assert.equal(arreglarNegritas('Mira **« Qué es un trabajo en altura»** y **bien**'), 'Mira **« Qué es un trabajo en altura»** y **bien**')
  assert.equal(arreglarNegritas('2 ** 3 y nada más'), '2 ** 3 y nada más')
})
