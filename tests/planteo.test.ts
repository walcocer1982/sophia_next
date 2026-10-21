import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planteaLaPregunta } from '../lib/planteo'

const preguntaDeAna = 'Mira la nota de Ana en el ecualizador del panel: ¿qué crees que le pasa si su TC2 baja a 0?'

test('una sola palabra en común no cuenta como plantear la pregunta (caso del 14 oct)', () => {
  const seguimiento = 'No exactamente. Llegaste 12 minutos tarde, así que ya pasó el plazo de tolerancia. Cuenta como inasistencia. ¿Qué crees que deberías hacer en ese momento?'
  assert.equal(planteaLaPregunta(seguimiento, preguntaDeAna), false)
})

test('la paráfrasis con las palabras clave sí cuenta', () => {
  assert.equal(planteaLaPregunta('Ahora mira la nota de Ana en el ecualizador: ¿qué crees que pasa si bajas su TC2 a 0?', preguntaDeAna), true)
  assert.equal(planteaLaPregunta('Ubica tu curso en el semáforo: ¿en qué color estás?', 'Ubica tu curso actual en el semáforo del panel: ¿en qué color estás y qué haces esta semana para no pasar al siguiente?'), true)
})

test('una pregunta sin palabras largas no se puede comprobar: se da por planteada', () => {
  assert.equal(planteaLaPregunta('¿Y qué más?', '¿Por qué esa?'), true)
})

test('la pregunta interrogativa completa cuenta aunque cambie la introducción (20 oct)', () => {
  const pregunta = 'De lo que señalaste: ¿Qué hay abajo de cada uno?'
  assert.equal(planteaLaPregunta('Señalas los bordes.\n\nDe lo que viste en esa obra: **¿Qué hay abajo de cada uno?**', pregunta), true)
  assert.equal(planteaLaPregunta('Bien. ¿Qué crees que deberías hacer?', pregunta), false)
})
