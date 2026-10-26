import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mensajePideSeguir, pideSeguir } from '../lib/pide-seguir'

test('pide seguir: lo que escribieron Maritza (24 oct) y Rosario (26 oct)', () => {
  for (const m of [
    'continua',
    'que continua',
    'y ahora aquí continúa',
    'agora?',
    'ahora que paso?',
    'por que no respondes?',
    'por que nmo respondes?',
    'podemos continuar?',
    'Sophía podemos continuar?',
    'no sale la actividad 3',
    '¿sigues ahí?',
    'no me deja avanzar',
  ]) assert.equal(pideSeguir(m), true, m)
})

test('no pide seguir: respuestas, continuaciones y dudas', () => {
  for (const m of [
    'listo',
    'continuar',
    'la altura es de 1.50',
    'no entiendo',
    'no encuentro el caso',
    'sigue trabajando sin arnés porque no hay línea de vida',
    'no sale del servicio, se retira el arnés',
    'si, como te mencioné considero que es porque no programa bien sus actividades',
    'voy a darte la respuesta que consideras pertinente: son problemas independientes que ocurren al mismo tiempo',
    'podemos continuar con el trabajo si se coloca la baranda en el borde del entrepiso antes de subir',
  ]) assert.equal(pideSeguir(m), false, m)
})

test('la respuesta fija repite lo último que Sophia pidió', () => {
  const ultimo = 'Bien pensado. Identificaste el peligro: el borde sin baranda. [[block:caso-1]]\n\nAhora, vuelve a la pregunta clave: ¿está o no está el operario en trabajo en altura? ¿Por qué?'
  const r = mensajePideSeguir(ultimo, 'Pregunta de la actividad')
  assert.match(r, /^Sigo aquí\. Para avanzar necesito tu respuesta a esta pregunta:\n\n/)
  assert.match(r, /¿está o no está el operario en trabajo en altura\? ¿Por qué\?$/)
  assert.doesNotMatch(r, /\[\[|Bien pensado/)
})

test('sin pedido en el último mensaje: la pregunta de la actividad', () => {
  assert.equal(
    mensajePideSeguir('Gracias por tu respuesta.', '¿Su conclusión se sostiene?'),
    'Sigo aquí. Para avanzar necesito tu respuesta a esta pregunta:\n\n¿Su conclusión se sostiene?',
  )
  assert.match(mensajePideSeguir('Tu respuesta quedó guardada.\n\nToca en «El umbral» la línea que la respalda.', ''), /^Sigo aquí\. Para avanzar falta este paso:\n\nToca en «El umbral»/)
})
