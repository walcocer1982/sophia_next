/**
 * Corre el verificador sobre un conjunto de casos ETIQUETADOS A MANO y mide
 * cuánto coincide con la etiqueta. Es la herramienta de la prioridad P6 de
 * investigacion/mejoras-sophia.md: el umbral y las reglas del verificador se
 * fijan contra estos casos, no mirando cómo quedó la distribución de la clase
 * («el 95 % salía logrado»).
 *
 * Formato del archivo (ver scripts/casos-verificacion.ejemplo.json):
 *   [{ "nombre", "actividad": Activity, "respuesta", "esperado": { "cubiertos": [1,3], "completed": false } }]
 *
 * Los índices de `cubiertos` son 1-based sobre success_criteria.must_include.
 *
 *   npx tsx scripts/calibrar-verificador.ts scripts/casos-verificacion.ejemplo.json
 */
import { readFileSync } from 'node:fs'
import { verifyActivityCompletion } from '../lib/activity-verification'
import type { Activity } from '../types/lesson'

interface Caso {
  nombre: string
  actividad: Activity
  respuesta: string
  esperado: { cubiertos: number[]; completed?: boolean }
}

function mismoConjunto(a: number[], b: number[]): boolean {
  const A = [...new Set(a)].sort((x, y) => x - y)
  const B = [...new Set(b)].sort((x, y) => x - y)
  return A.length === B.length && A.every((v, i) => v === B[i])
}

async function main() {
  const ruta = process.argv[2]
  if (!ruta) {
    console.error('Uso: npx tsx scripts/calibrar-verificador.ts <casos.json>')
    process.exit(1)
  }
  const casos = JSON.parse(readFileSync(ruta, 'utf-8')) as Caso[]
  console.log(`${casos.length} caso(s) desde ${ruta}\n`)

  let exactos = 0
  let completedOk = 0
  let completedTotal = 0
  let criticosOk = 0
  let criticosTotal = 0
  let sinVerificar = 0

  for (const caso of casos) {
    const criterios = caso.actividad.verification.success_criteria?.must_include ?? []
    const r = await verifyActivityCompletion(caso.respuesta, caso.actividad, [])
    if (r.unverified) {
      sinVerificar++
      console.log(`✗ ${caso.nombre}: el verificador no respondió`)
      continue
    }
    const obtenidos = r.criteriaMatched
      .map((c) => criterios.indexOf(c) + 1)
      .filter((i) => i > 0)
    const exacto = mismoConjunto(obtenidos, caso.esperado.cubiertos)
    if (exacto) exactos++

    if (typeof caso.esperado.completed === 'boolean') {
      completedTotal++
      if (r.completed === caso.esperado.completed) completedOk++
    }

    for (const idx of caso.actividad.verification.success_criteria?.critical ?? []) {
      criticosTotal++
      const esperadoCubierto = caso.esperado.cubiertos.includes(idx)
      const obtenidoCubierto = obtenidos.includes(idx)
      if (esperadoCubierto === obtenidoCubierto) criticosOk++
    }

    console.log(
      `${exacto ? '✓' : '✗'} ${caso.nombre}: esperado [${caso.esperado.cubiertos.join(',')}] · obtenido [${obtenidos.join(',')}] · ${r.understanding_level} · completed=${r.completed} · intent=${r.student_intent}`
    )
  }

  const evaluados = casos.length - sinVerificar
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : 'n/a')
  console.log('\nRESUMEN')
  console.log(`  coincidencia exacta de criterios: ${exactos}/${evaluados} (${pct(exactos, evaluados)})`)
  console.log(`  acuerdo en «completed»:           ${completedOk}/${completedTotal} (${pct(completedOk, completedTotal)})`)
  console.log(`  acuerdo en eliminatorios:         ${criticosOk}/${criticosTotal} (${pct(criticosOk, criticosTotal)})  ← meta ≥ 90 %`)
  if (sinVerificar) console.log(`  sin verificar (API):               ${sinVerificar}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
