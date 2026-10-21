import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alternar, describeSubrayadoForPrompt, describeSubrayadoForVerifier, lineasDelTexto, sanitizeSubrayado, sinSubrayar } from '../lib/subrayado'
import type { TextBlock } from '../types/lesson'

const texto: TextBlock = {
  id: 'norma-x',
  type: 'text',
  title: 'La regla',
  subrayable: true,
  body: ['- **Primera** condición del texto.', '', '- Segunda condición del texto.', '- Tercera condición.'].join('\n'),
}

test('las líneas tocables son las no vacías', () => {
  assert.equal(lineasDelTexto(texto.body).length, 3)
})

test('el estado del navegador se acota a las líneas que existen', () => {
  assert.deepEqual(sanitizeSubrayado(texto, { lineas: [2, 0, 0, 7, -1, 1.5] }), { lineas: [0, 2] })
  assert.equal(sanitizeSubrayado(texto, { lineas: 'x' }), null)
})

test('subrayar y quitar con el mismo toque', () => {
  let s = alternar(sinSubrayar(), 1)
  s = alternar(s, 0)
  assert.deepEqual(s, { lineas: [0, 1] })
  assert.deepEqual(alternar(s, 1), { lineas: [0] })
})

test('Sophia y el verificador reciben el texto subrayado, sin marcas', () => {
  const s = { lineas: [0] }
  assert.ok(describeSubrayadoForPrompt(texto, s).includes('subrayó «Primera condición del texto.»'))
  assert.ok(describeSubrayadoForPrompt(texto, sinSubrayar()).includes('todavía no subrayó nada'))
  assert.equal(describeSubrayadoForVerifier(texto, sinSubrayar()), null)
  assert.ok(describeSubrayadoForVerifier(texto, s)?.endsWith(': «Primera condición del texto.».'))
})

test('lo guardado se lee sin confiar en su forma; el pedido de subrayar no califica', async () => {
  const { leerSubrayadoGuardado, paraGuardar, mensajeTurnoDeSubrayar } = await import('../lib/subrayado')
  assert.deepEqual(paraGuardar(texto, { lineas: [2] }), { blockId: 'norma-x', titulo: 'La regla', lineas: ['Tercera condición.'] })
  assert.equal(paraGuardar(texto, { lineas: [] }), null)
  assert.deepEqual(leerSubrayadoGuardado({ subrayado: [{ blockId: 'a', titulo: 'T', lineas: ['x'] }, { titulo: 3 }] }), [{ blockId: 'a', titulo: 'T', lineas: ['x'] }])
  assert.deepEqual(leerSubrayadoGuardado(null), [])
  const g = mensajeTurnoDeSubrayar(['La regla'])
  // Prueba de Edwin (21 oct): «Anoto tu respuesta» se leía como «no llegó» y volvía a dictarla.
  assert.ok(g.startsWith('Tu respuesta quedó guardada.') && g.includes('«La regla»') && g.includes('No hace falta escribir de nuevo'))
  assert.ok(!/correct|exact|bien/i.test(g))
})

test('la línea que respalda: acierta, se equivoca, subraya de más; la clave no llega al navegador', async () => {
  const { evaluarSubrayado, lineasClaveTexto, ocultarClaves, describeSubrayadoForPrompt, mensajeRevisarSubrayado, guiaRevelarSubrayado } = await import('../lib/subrayado')
  const conClave = { ...texto, lineasClave: [2] }
  assert.equal(evaluarSubrayado(conClave, { lineas: [] }), 'sin_subrayar')
  assert.equal(evaluarSubrayado(texto, { lineas: [0] }), 'sin_clave')
  assert.equal(evaluarSubrayado(conClave, { lineas: [2] }), 'respalda')
  assert.equal(evaluarSubrayado(conClave, { lineas: [0] }), 'no_respalda')
  assert.equal(evaluarSubrayado(conClave, { lineas: [1, 2] }), 'respalda')
  assert.equal(evaluarSubrayado(conClave, { lineas: [0, 1, 2] }), 'no_respalda')
  assert.deepEqual(lineasClaveTexto(conClave), ['Tercera condición.'])
  const [oculto] = ocultarClaves([conClave])
  assert.equal('lineasClave' in oculto, false)
  assert.ok(describeSubrayadoForPrompt(conClave, { lineas: [0] }).includes('NO respalda'))
  const revisar = mensajeRevisarSubrayado(conClave)
  assert.ok(revisar.includes('Inténtalo de nuevo') && revisar.includes('«La regla»') && !revisar.includes('Tercera'))
  assert.ok(guiaRevelarSubrayado(conClave).includes('«Tercera condición.»'))
})

test('de lo subrayado, solo se pintan de verde las líneas que respaldan (21 oct)', async () => {
  const { subrayadasQueRespaldan } = await import('../lib/subrayado')
  assert.deepEqual(subrayadasQueRespaldan({ ...texto, lineasClave: [2] }, { lineas: [0, 2] }), ['Tercera condición.'])
})

test('la pantalla reconoce el pedido y el recordatorio de subrayar (prueba de Edwin, 21 oct)', async () => {
  const { mensajeTurnoDeSubrayar, mensajeRecordatorioSubrayado, textosPedidosEn } = await import('../lib/subrayado')
  const bloques = [{ id: 'norma-x', title: 'La regla', type: 'text' }, { id: 'img', title: 'La regla', type: 'image' }]
  assert.deepEqual(textosPedidosEn(mensajeTurnoDeSubrayar(['La regla']), bloques), ['norma-x'])
  assert.deepEqual(textosPedidosEn(mensajeRecordatorioSubrayado(['La regla']), bloques), ['norma-x'])
  assert.deepEqual(textosPedidosEn('Toca en «La regla» la línea, por favor.', bloques), [])
  assert.ok(mensajeRecordatorioSubrayado(['La regla']).includes('ya quedó guardada'))
})
