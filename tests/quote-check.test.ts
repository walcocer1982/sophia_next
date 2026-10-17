import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exigirCitasDelBloque, frasesCitadas, frasesDelBloque } from '../lib/quote-check'
import type { SupportBlock } from '../types/lesson'

const manual: SupportBlock = {
  id: 'manual-extintores',
  type: 'text',
  title: 'Manual de uso de extintores',
  body: [
    'Un extintor portátil es un equipo que contiene un agente extintor a presión, para apagar fuegos incipientes.',
    '',
    'Procedimiento de uso:',
    '1. Halar el seguro.',
    '2. Apuntar la boquilla a la base del fuego.',
    '3. Apretar la palanca.',
    '4. Barrer de lado a lado.',
    '',
    'La distancia recomendada es de 2 a 3 metros del fuego. Nunca use un extintor de agua en fuegos de equipos eléctricos: el agua conduce la electricidad.',
    '',
    'Los extintores son muy importantes para la seguridad de todos y deben estar siempre a la vista.',
  ].join('\n'),
}

test('el texto se parte en frases citables, sin numeración', () => {
  const f = frasesDelBloque(manual)
  assert.ok(f.includes('Halar el seguro.'))
  assert.ok(f.includes('La distancia recomendada es de 2 a 3 metros del fuego.'))
})

test('encuentra las frases que el alumno copió, aunque las recorte o cambie mayúsculas', () => {
  const alumno = ['1) halar el seguro (paso)\n2) la distancia recomendada es de 2 a 3 metros (dato)\n3) nunca use un extintor de agua en fuegos eléctricos (advertencia)\n4) un extintor portatil es un equipo (definición)']
  assert.equal(frasesCitadas(alumno, manual).length, 4)
})

test('frases inventadas o parafraseadas no cuentan', () => {
  const alumno = ['subrayo: hay que tener cuidado con el fuego, el extintor es rojo, siempre avisar al supervisor, usar guantes']
  assert.equal(frasesCitadas(alumno, manual).length, 0)
})

test('un criterio cubierto sin las frases mínimas del bloque pasa a «falta»', () => {
  const must = ['Lista cuatro frases que existen en el fragmento', 'Clasifica cada una']
  const result = { criteriaMatched: [1, 2], criteriaMissing: [] as unknown[] }
  const alumno = ['halar el seguro es un paso, apretar la palanca también, y los extintores son rojos y bonitos']
  const n = exigirCitasDelBloque(result, [{ criterion: 1, block: 'manual-extintores', min: 4 }], must, [manual], alumno)
  assert.equal(n, 1)
  assert.deepEqual(result.criteriaMatched, [2])
  assert.deepEqual(result.criteriaMissing, [1])
})

test('con las cuatro frases el criterio se mantiene; un criterio no cubierto no se toca', () => {
  const must = ['Lista cuatro frases que existen en el fragmento', 'Clasifica cada una']
  const result = { criteriaMatched: [1], criteriaMissing: [2] as unknown[] }
  const alumno = ['Halar el seguro; apretar la palanca; barrer de lado a lado; la distancia recomendada es de 2 a 3 metros']
  const n = exigirCitasDelBloque(result, [{ criterion: 1, block: 'manual-extintores', min: 4 }, { criterion: 2, block: 'manual-extintores' }], must, [manual], alumno)
  assert.equal(n, 0)
  assert.deepEqual(result.criteriaMatched, [1])
})
