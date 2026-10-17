import { test } from 'node:test'
import assert from 'node:assert/strict'
import { citedBlocksInOrder, citedFromTexts, createMarkerFilter, filterMarkersInText, splitChoiceOptions, stripMarkers } from '../lib/material-markers'

test('quita los marcadores del texto visible, también el parcial del final', () => {
  assert.equal(stripMarkers('Mira el manual [[block:manual-extintores]].'), 'Mira el manual.')
  assert.equal(stripMarkers('Fíjate en el punto 2 [[marker:escena-techo:2]] y dime'), 'Fíjate en el punto 2 y dime')
  assert.equal(stripMarkers('Lee el texto [[blo'), 'Lee el texto ')
  // Un id suelto entre corchetes no se muestra; una cita o nota normal sí
  assert.equal(stripMarkers('mira la fórmula en el panel [formula-nota] y dime'), 'mira la fórmula en el panel y dime')
  assert.equal(stripMarkers('según la nota [1] y el punto [A]'), 'según la nota [1] y el punto [A]')
})

test('reconoce qué bloques y señalamientos se citaron', () => {
  const c = citedFromTexts(['Mira [[block:semaforo]].', 'Punto [[marker:escena:2]] y [[block:caso-rosa]]'])
  assert.deepEqual([...c.blocks].sort(), ['caso-rosa', 'semaforo'])
  assert.deepEqual([...c.markers], ['escena:2'])
  assert.deepEqual(citedBlocksInOrder('[[block:b]] x [[block:a]] y [[block:b]]'), ['b', 'a'])
  // Un señalamiento cita su imagen: la escena se queda en el panel
  assert.deepEqual(citedBlocksInOrder('Bien. [[marker:escena:3]] Ahora [[block:tabla]]'), ['escena', 'tabla'])
})

test('el filtro quita los marcadores no permitidos', () => {
  const permitido = (k: string, id: string) => k === 'block' && id === 'ok'
  assert.equal(filterMarkersInText('a [[block:ok]] b [[block:no]] c [[marker:ok:1]]', permitido), 'a [[block:ok]] b  c ')
})

test('el filtro de streaming retiene un marcador partido entre trozos', () => {
  const f = createMarkerFilter((k) => k === 'block')
  let out = ''
  out += f.push('Mira el semáforo [[blo')
  assert.equal(out, 'Mira el semáforo ')
  out += f.push('ck:semaforo]] y el punto [[mark')
  out += f.push('er:escena:2]] fin')
  out += f.flush()
  assert.equal(out, 'Mira el semáforo [[block:semaforo]] y el punto  fin')
})

test('separa las alternativas del final del mensaje', () => {
  const r = splitChoiceOptions('Mira el caso.\n\n¿Qué pasó?\n\nA) Le anularon el examen\nB) Superó el límite de faltas\nC) No entregó un TC')
  assert.equal(r.options.length, 3)
  assert.equal(r.options[1].text, 'Superó el límite de faltas')
  assert.equal(r.body, 'Mira el caso.\n\n¿Qué pasó?')

  const conCola = splitChoiceOptions('Pregunta:\nA) 12\nB) 13\n\n¿Cuál es tu respuesta?')
  assert.equal(conCola.options.length, 2)
  assert.equal(conCola.tail, '¿Cuál es tu respuesta?')

  // Opciones como párrafos (una línea en blanco entre ellas), con cola
  const separadas = splitChoiceOptions('Mario tiene fiebre. ¿Qué hace?\n\nA) Falta sin avisar\n\nB) Va a clase igual\n\nC) Falta y avisa\n\n¿Cuál opción elige?')
  assert.deepEqual(separadas.options.map((o) => o.letter), ['A', 'B', 'C'])
  assert.equal(separadas.body, 'Mario tiene fiebre. ¿Qué hace?')
  assert.equal(separadas.tail, '¿Cuál opción elige?')

  assert.equal(splitChoiceOptions('Solo texto, sin opciones.').options.length, 0)
  assert.equal(splitChoiceOptions('B) suelta\nC) sin la A').options.length, 0)
})
