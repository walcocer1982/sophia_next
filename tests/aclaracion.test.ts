import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guiaAclaracion, pideAclaracion } from '../lib/aclaracion'

test('prueba de Edwin (21 oct): pedir que aclaren la pregunta no es responderla', () => {
  assert.equal(pideAclaracion('¿Puedes en poquito profundizar la pregunta, a qué te refieres con cada 1 te refieres a la persona o a los elementos que yo he mencionado?'), true)
  assert.equal(pideAclaracion('No entiendo la pregunta'), true)
  assert.equal(pideAclaracion('¿Qué me pides exactamente?'), true)
  assert.equal(pideAclaracion('¿me puedes explicar mejor la pregunta?'), true)
})

test('simulación del 21 oct: pedir aclarar tratando de usted y con ejemplos, en 70 palabras', () => {
  const largo = 'Profe, perdón, pero no me queda claro a qué se refiere con "cada uno". ¿Habla de abajo de cada borde de la losa, o abajo de cada material apilado, o abajo de cada trabajador? Porque en cada caso hay cosas diferentes, ¿no? Por ejemplo, abajo del borde que mira hacia las casas hay viviendas, pero abajo del otro lado hay más construcción y vacío. Acláreme qué puntos me pide que analice exactamente.'
  assert.equal(pideAclaracion(largo), true)
  assert.equal(pideAclaracion('Profe, ¿me aclara qué quiere que haga?'), true)
})

test('una respuesta, o una duda de contenido, no es pedir aclaración', () => {
  assert.equal(pideAclaracion('Veo muchos trabajadores trabajando con fierro, con chaleco y con casco.'), false)
  assert.equal(pideAclaracion('Bueno, en cada uno de ellos debajo hay materiales y el piso de abajo.'), false)
  assert.equal(pideAclaracion('¿Qué es caída a distinto nivel?'), false)
  // Larga: trae una respuesta aunque mencione la pregunta; se evalúa
  const larga = 'No sé a qué te refieres exactamente, pero creo que debajo del borde de la losa está el piso de abajo, y debajo de las tablas apiladas también hay gente trabajando, así que si algo cae le llega a ellos y si cae una persona golpea el concreto o las varillas que están abajo de la parrilla.'
  assert.equal(pideAclaracion(larga), false)
})

test('la guía repite la pregunta y prohíbe responderla o avanzar', () => {
  const g = guiaAclaracion('¿Qué hay abajo de cada uno?')
  assert.ok(g.includes('"¿Qué hay abajo de cada uno?"') && g.includes('NO se evalúa ni avanza') && g.includes('PROHIBIDO responderla'))
  // Simulación del 21 oct: «Te refiero a…» y dos preguntas de más antes de repetir la suya.
  assert.ok(g.includes('Empieza con "Me refiero a"') && g.includes('otra pregunta además de la repetida'))
})

test('«como me explica» dentro de una respuesta no es pedir aclaración', () => {
  assert.equal(pideAclaracion('Como usted me explica, sí es trabajo en altura porque hay electricidad activa debajo.'), false)
})
