import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extraerEjemploResuelto } from '../lib/prompt-builder'

// Simulaciones del 22 oct 2026: en la transición Sophia enseñaba la regla y se saltaba el
// ejemplo («Ahora pasamos a mapear: una celda no describe una galería entera…» y la pregunta).
test('la transición reconoce el ejemplo resuelto de la instrucción', () => {
  const ins = 'Enseña primero, con la lámina «Mapeo por celdas en una galería» de la pizarra: una celda no describe una galería. Resuelve tú este ejemplo: una galería de 60 m con una sola celda al inicio no está mapeada: faltan celdas a lo largo, con metraje y fecha. Primero regla y ejemplo, sin mandar a leer otro texto; después, la pregunta tal cual.'
  assert.equal(extraerEjemploResuelto(ins), 'una galería de 60 m con una sola celda al inicio no está mapeada: faltan celdas a lo largo, con metraje y fecha.')
})

test('sin «Resuelve tú» no hay ejemplo que exigir', () => {
  assert.equal(extraerEjemploResuelto('Caso corto individual. Dile que lea el caso en la pizarra.'), null)
})

// El mismo extractor alimenta la línea «EL EJEMPLO YA LO RESOLVISTE TÚ» del prompt de la actividad:
// en la simulación del 22 oct, Sophia corrigió «Es split set» contra su ejemplo del vale con resina.
test('el ejemplo del vale con resina se reconoce para separarlo de la pregunta', () => {
  const ins = 'Enseña primero, con la lámina «Detalle del perno helicoidal» de la pizarra: un perno se reconoce por cómo ancla. Resuelve tú este ejemplo: en un vale llega «barra de 19 mm con cartuchos de resina y cemento»: es perno helicoidal: ancla con resina o cemento dentro del taladro. Primero regla y ejemplo, sin mandar a leer otro texto; después, la pregunta tal cual.'
  assert.match(extraerEjemploResuelto(ins) ?? '', /^en un vale llega «barra de 19 mm con cartuchos de resina y cemento»/)
})
