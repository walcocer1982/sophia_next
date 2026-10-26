import { test as it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { decidirDesglose } from '../lib/desglose'

const practica = { topeDeDesgloses: 3, topeDeIntentos: 2, sinNota: false }

describe('decidirDesglose', () => {
  it('Gianny (SI A, 26 oct): con nota y 2 intentos, solo el primer turno se desglosa', () => {
    assert.equal(decidirDesglose({ ...practica, intentos: 0, desgloses: 0 }), 'desglosa')
    // Antes: los intentos seguían en 0 y se desglosaba hasta 3 veces.
    assert.equal(decidirDesglose({ ...practica, intentos: 0, desgloses: 1 }), 'tope-de-intentos')
  })

  it('un intento ya contado también gasta el tope', () => {
    assert.equal(decidirDesglose({ ...practica, intentos: 1, desgloses: 0 }), 'tope-de-intentos')
  })

  it('con más intentos que desgloses, manda el tope de desglose del tipo', () => {
    const p = { topeDeDesgloses: 1, topeDeIntentos: 5, sinNota: false }
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 0 }), 'desglosa')
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 1 }), 'tope-de-desglose')
  })

  it('sin nota, el tope de intentos cierra por el camino del tope de desglose (como antes)', () => {
    const p = { topeDeDesgloses: 3, topeDeIntentos: 2, sinNota: true }
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 0 }), 'desglosa')
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 1 }), 'tope-de-desglose')
  })

  it('con 3 intentos caben dos desgloses y el tercer turno cierra', () => {
    const p = { topeDeDesgloses: 3, topeDeIntentos: 3, sinNota: false }
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 0 }), 'desglosa')
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 1 }), 'desglosa')
    assert.equal(decidirDesglose({ ...p, intentos: 0, desgloses: 2 }), 'tope-de-intentos')
  })
})
