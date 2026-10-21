import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comillasEnTitulos, crearCorrectorDeTitulos } from '../lib/titulos-material'

const TITULOS = ['Obra en losa', 'Cuándo una tarea es trabajo en altura', 'Caída de objetos', 'Caso']

test('prueba de Edwin (21 oct): el título suelto en la oración va entre «»', () => {
  assert.equal(
    comillasEnTitulos('Mira la fotografía Obra en losa en la pizarra, sin leer nada más: ¿Qué está pasando en esta obra?', TITULOS),
    'Mira la fotografía «Obra en losa» en la pizarra, sin leer nada más: ¿Qué está pasando en esta obra?',
  )
  assert.equal(
    comillasEnTitulos('Toca en el texto Cuándo una tarea es trabajo en altura la línea que respalda.', TITULOS),
    'Toca en el texto «Cuándo una tarea es trabajo en altura» la línea que respalda.',
  )
})

test('no toca lo que ya va entre comillas ni una frase normal que coincide con un título', () => {
  const ya = 'Mira la fotografía «Obra en losa» de la pizarra.'
  assert.equal(comillasEnTitulos(ya, TITULOS), ya)
  assert.equal(comillasEnTitulos('Mira la fotografía "Obra en losa".', TITULOS), 'Mira la fotografía "Obra en losa".')
  const frase = 'La caída de objetos alcanza a quien no está trabajando en altura.'
  assert.equal(comillasEnTitulos(frase, TITULOS), frase)
  // Títulos de una sola palabra no se envuelven: son palabras comunes
  assert.equal(comillasEnTitulos('Lee el caso Caso en la pizarra.', TITULOS), 'Lee el caso Caso en la pizarra.')
})

test('en streaming da lo mismo que de una vez, se corte donde se corte', () => {
  const texto = 'Hola. Mira la fotografía Obra en losa en la pizarra y después el texto Cuándo una tarea es trabajo en altura, que está al lado. La caída de objetos es otro tema.'
  const esperado = comillasEnTitulos(texto, TITULOS)
  for (const paso of [1, 2, 3, 5, 7, 11, 40]) {
    const c = crearCorrectorDeTitulos(TITULOS)
    let salida = ''
    for (let i = 0; i < texto.length; i += paso) salida += c.push(texto.slice(i, i + paso))
    salida += c.flush()
    assert.equal(salida, esperado, `trozos de ${paso}`)
  }
})
