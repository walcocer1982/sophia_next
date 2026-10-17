import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elegirVoz, textoParaLeer } from '../lib/voz'

test('lo que se lee no lleva marcadores, markdown ni tablas', () => {
  const t = textoParaLeer('Mira **el caso** de Luis [[block:caso-luis]].\n\n| Faltas | Color |\n|---|---|\n| 3 | Rojo |\n\n→ ¿Qué crees que pasó?')
  assert.deepEqual(t, ['Mira el caso de Luis. ¿Qué crees que pasó?'])
})

test('las alternativas se leen con su letra y los textos largos se parten en oraciones', () => {
  assert.deepEqual(textoParaLeer('Elige:\nA) Va a clase\nB) Falta y avisa'), ['Elige: A: Va a clase B: Falta y avisa'])
  const largo = 'Primera oración bastante larga para llenar espacio y pasar el límite de lectura. '.repeat(4)
  assert.ok(textoParaLeer(largo).length >= 2)
  assert.ok(textoParaLeer(largo).every((o) => o.length <= 200))
})

test('elige la voz: Perú y Latinoamérica antes que España, y las naturales antes que las básicas', () => {
  const voces = [
    { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' },
    { name: 'Google español de Estados Unidos', lang: 'es-US' },
    { name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
    { name: 'Microsoft Zira', lang: 'en-US' },
  ]
  assert.equal(elegirVoz(voces)?.name, 'Microsoft Dalia Online (Natural) - Spanish (Mexico)')
  assert.equal(elegirVoz([voces[0], voces[3]])?.name, 'Microsoft Helena - Spanish (Spain)')
  assert.equal(elegirVoz([voces[3]]), null)
})
