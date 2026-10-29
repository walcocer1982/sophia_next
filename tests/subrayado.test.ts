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

test('prueba de Walther (21 oct): una línea equivocada deja el pedido pendiente; la revelada o la correcta lo cierran', async () => {
  const { pendientesDeSubrayar, mensajeTurnoDeSubrayar } = await import('../lib/subrayado')
  const bloques = [{ id: 'norma-x', title: 'La regla', type: 'text', activityId: 'a4' }]
  const base = { bloques, actividadActual: 'a4' }
  // Pedido sin tocar
  assert.deepEqual(pendientesDeSubrayar({ ...base, ultimoMensajeDeSophia: mensajeTurnoDeSubrayar(['La regla']), subrayados: {}, revisados: {} }), { ids: ['norma-x'], motivo: 'pedido' })
  // Tocó: mientras viaja la revisión, ya no es «pedido»
  assert.deepEqual(pendientesDeSubrayar({ ...base, ultimoMensajeDeSophia: mensajeTurnoDeSubrayar(['La regla']), subrayados: { 'norma-x': { lineas: [0] } }, revisados: {} }), { ids: [], motivo: null })
  // Línea equivocada: pendiente aunque haya una línea marcada y Sophia diga otra cosa
  const mal = { 'norma-x': { blockId: 'norma-x', resultado: 'no_respalda' as const } }
  assert.deepEqual(pendientesDeSubrayar({ ...base, ultimoMensajeDeSophia: 'Decides que sí; ¿qué hay justo debajo?', subrayados: { 'norma-x': { lineas: [0] } }, revisados: mal }), { ids: ['norma-x'], motivo: 'equivocada' })
  // Revelada o correcta: ya no
  assert.deepEqual(pendientesDeSubrayar({ ...base, ultimoMensajeDeSophia: 'x', subrayados: { 'norma-x': { lineas: [0] } }, revisados: { 'norma-x': { blockId: 'norma-x', resultado: 'no_respalda' as const, revelada: ['Tercera condición.'] } } }).ids, [])
  assert.deepEqual(pendientesDeSubrayar({ ...base, ultimoMensajeDeSophia: 'x', subrayados: { 'norma-x': { lineas: [2] } }, revisados: { 'norma-x': { blockId: 'norma-x', resultado: 'respalda' as const } } }).ids, [])
  // En otra actividad, la revisión vieja no cuenta
  assert.deepEqual(pendientesDeSubrayar({ ...base, actividadActual: 'a5', ultimoMensajeDeSophia: 'x', subrayados: { 'norma-x': { lineas: [0] } }, revisados: mal }).ids, [])
})

test('prueba de Maritza (21 oct): tocar otra vez la misma línea equivocada se vuelve a revisar', async () => {
  const { hayQueRevisarSubrayado, esRepeticionEquivocada } = await import('../lib/subrayado')
  const mal = { lineas: '0', resultado: 'no_respalda', revelada: false }
  // La misma línea equivocada, en un toque: sí
  assert.equal(hayQueRevisarSubrayado('0', mal, true), true)
  assert.equal(esRepeticionEquivocada('0', mal, true), true)
  // La misma línea, pero en un mensaje escrito (sigue marcada en el navegador): no
  assert.equal(hayQueRevisarSubrayado('0', mal, false), false)
  // La misma línea ya revelada, o ya correcta: no (antes se repetía «✓ respalda» bajo cada mensaje)
  assert.equal(hayQueRevisarSubrayado('0', { ...mal, revelada: true }, true), false)
  assert.equal(hayQueRevisarSubrayado('2', { lineas: '2', resultado: 'respalda', revelada: false }, true), false)
  // Una línea distinta: siempre; nada marcado: nunca
  assert.equal(hayQueRevisarSubrayado('1', mal, false), true)
  assert.equal(hayQueRevisarSubrayado('', mal, true), false)
})

test('28 oct: sin juzgar, el prompt no le dice a Sophia si la línea respalda (PM S7)', async () => {
  const { describeSubrayadoForPrompt } = await import('../lib/subrayado')
  const conClave = { ...texto, lineasClave: [2] }
  const sinJuicio = describeSubrayadoForPrompt(conClave, { lineas: [0] }, false)
  assert.ok(!/NO respalda|SÍ respalda|por qué eligió/.test(sinJuicio), sinJuicio)
  assert.ok(/no digas si esa línea respalda/.test(sinJuicio), sinJuicio)
  // Juzgando (respuesta aprobada o toque pedido), el juicio sigue
  assert.ok(/NO respalda/.test(describeSubrayadoForPrompt(conClave, { lineas: [0] })))
})

test('28 oct: una línea que viajó con una respuesta que no aprobó queda sin juzgar hasta que apruebe', async () => {
  const { subrayadoSinJuzgar } = await import('../lib/subrayado')
  // Se guardó sin resultado: la misma línea sigue pendiente de juicio
  assert.equal(subrayadoSinJuzgar('3', { lineas: '3', revelada: false }), true)
  // Ya juzgada (verde o roja): no se vuelve a juzgar por estar marcada
  assert.equal(subrayadoSinJuzgar('3', { lineas: '3', resultado: 'respalda', revelada: false }), false)
  assert.equal(subrayadoSinJuzgar('3', { lineas: '3', resultado: 'no_respalda', revelada: false }), false)
  // Otra línea, nada guardado o nada marcado: no es este caso
  assert.equal(subrayadoSinJuzgar('2', { lineas: '3', revelada: false }), false)
  assert.equal(subrayadoSinJuzgar('3', undefined), false)
  assert.equal(subrayadoSinJuzgar('', { lineas: '', revelada: false }), false)
})

test('línea correcta: la primera oración la fija el código, con y sin respuesta aprobada', async () => {
  const { guiaLineaCorrecta } = await import('../lib/subrayado')
  const a = guiaLineaCorrecta(true)
  const b = guiaLineaCorrecta(false)
  assert.ok(a.includes('"Esa es la línea."') && a.includes('PROHIBIDO pedirle otra línea') && a.includes('transición'))
  assert.ok(b.includes('"Esa es la línea."') && b.includes('lo que falta de su respuesta escrita') && !b.includes('transición'))
})

test('clase de EOM (23 oct): la línea se pide solo si la respuesta aprobó y no tocó ya una', async () => {
  const { faltaTocarLaLinea } = await import('../lib/subrayado')
  // «Sí, porque terminaría más rápido» (lo contrario de la lección): no se pide la línea.
  assert.equal(faltaTocarLaLinea({ textos: [sinSubrayar()], tocoAntes: false, aprobo: false }), false)
  // Respuesta aprobada, sin tocar nada: se pide.
  assert.equal(faltaTocarLaLinea({ textos: [sinSubrayar()], tocoAntes: false, aprobo: true }), true)
  // Tocó la línea, recargó la página y el navegador la olvidó: lo guardado cuenta.
  assert.equal(faltaTocarLaLinea({ textos: [sinSubrayar()], tocoAntes: true, aprobo: true }), false)
  // Respondió y tocó en el mismo mensaje.
  assert.equal(faltaTocarLaLinea({ textos: [{ lineas: [3] }], tocoAntes: false, aprobo: true }), false)
  // Sin texto para tocar en la actividad.
  assert.equal(faltaTocarLaLinea({ textos: [], tocoAntes: false, aprobo: true }), false)
})

test('Sophia no pide la línea por su cuenta cuando todavía no subrayó (23 oct)', () => {
  const t = describeSubrayadoForPrompt(texto, sinSubrayar())
  assert.match(t, /No le pidas que toque una línea/)
  assert.doesNotMatch(t, /pídele que toque/)
})

test('al recargar, lo tocado vuelve a la pizarra desde los mensajes guardados (23 oct)', async () => {
  const { subrayadosDesdeMensajes } = await import('../lib/subrayado')
  const bloques = new Map([[texto.id, texto]])
  const materiales = [
    null,
    { subrayado: [{ blockId: 'norma-x', titulo: 'La regla', lineas: ['Segunda condición del texto.'], resultado: 'no_respalda' }] },
    { subrayado: [{ blockId: 'norma-x', titulo: 'La regla', lineas: ['Primera condición del texto.'], resultado: 'respalda' }] },
    { subrayado: [{ blockId: 'otro', titulo: 'Otro', lineas: ['x'] }] },
  ]
  // Queda lo último que tocó en cada texto; un texto que ya no existe se ignora.
  assert.deepEqual(subrayadosDesdeMensajes(materiales, bloques), { 'norma-x': { lineas: [0] } })
  assert.deepEqual(subrayadosDesdeMensajes([], bloques), {})
})
