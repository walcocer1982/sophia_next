/**
 * Cifras de un criterio (21 oct 2026). Simulación «apurado» de SI-ALTORIESGO S1:
 * el alumno decidió bien («sí está en trabajo en altura») con un umbral falso
 * («dice 1,50 m»; antes «1,80 m»). El verificador aprobó el criterio
 * eliminatorio 3 de 3 veces aunque el prompt se lo prohibía, y Sophia repitió
 * el dato falso como «Exacto». Se comprueba en código, como las citas.
 *
 * Solo cuentan los valores con unidad («1,20 m», «60 cm», «25 %»): así no se
 * confunden con códigos de norma, artículos o años. Un valor que ya viene en la
 * pregunta o en el caso es un dato, no algo que el alumno tenga que saber.
 * Independiente del tema: los valores los pone la lección.
 */

export interface Valor {
  n: number
  unidad: string
}

const UNIDADES: Record<string, string> = {
  m: 'm', metro: 'm', metros: 'm',
  cm: 'cm', centimetro: 'cm', centimetros: 'cm',
  mm: 'mm', km: 'km', kg: 'kg', g: 'g', t: 't', l: 'l',
  '%': '%', h: 'h', min: 'min',
  pie: 'pie', pies: 'pie', v: 'v', kv: 'kv',
}

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Los valores con unidad de un texto («1,20 m» y «1.2 metros» son el mismo). */
export function valoresConUnidad(texto: string): Valor[] {
  const re = /(\d+(?:[.,]\d+)?)\s*(%|[a-zA-Z]+)/g
  const out: Valor[] = []
  for (const m of sinTildes(texto).matchAll(re)) {
    const unidad = UNIDADES[m[2].toLowerCase()]
    if (!unidad) continue
    out.push({ n: Number(m[1].replace(',', '.')), unidad })
  }
  return out
}

const igual = (a: Valor, b: Valor) => a.unidad === b.unidad && Math.abs(a.n - b.n) < 1e-9

/**
 * ¿Lo que dijo el alumno contradice las cifras del criterio?
 * - Sin valores que saber (todos vienen en la pregunta): no.
 * - Dijo alguno de los valores del criterio: no.
 * - Dio otro valor con la misma unidad, que tampoco viene en la pregunta: sí.
 * - No dio cifras con esa unidad: no (lo juzga el verificador).
 */
export function contradiceCifras(criterio: string, textosDelAlumno: string[], datosDados: string): boolean {
  const dados = valoresConUnidad(datosDados)
  const porSaber = valoresConUnidad(criterio).filter((v) => !dados.some((d) => igual(d, v)))
  if (porSaber.length === 0) return false
  const delAlumno = valoresConUnidad(textosDelAlumno.join(' '))
  if (delAlumno.some((v) => porSaber.some((r) => igual(r, v)))) return false
  const unidades = new Set(porSaber.map((v) => v.unidad))
  return delAlumno.some((v) => unidades.has(v.unidad) && !dados.some((d) => igual(d, v)))
}

/**
 * Pasa de criteriaMatched a criteriaMissing los criterios cuya cifra el alumno
 * contradice. Muta `result` (criterios como números 1-based o como texto) y
 * devuelve cuántos descartó.
 */
export function descartarCifrasContradichas(
  result: { criteriaMatched?: unknown; criteriaMissing?: unknown },
  mustInclude: string[],
  textosDelAlumno: string[],
  datosDados: string,
): number {
  const matched = Array.isArray(result.criteriaMatched) ? result.criteriaMatched : []
  const missing = Array.isArray(result.criteriaMissing) ? [...result.criteriaMissing] : []
  const conservados: unknown[] = []
  for (const v of matched) {
    const criterio = typeof v === 'number' ? mustInclude[v - 1] : String(v)
    if (criterio && contradiceCifras(criterio, textosDelAlumno, datosDados)) {
      missing.push(v)
      console.warn('⚠️  verifier.cifra_contradicha', { criterio })
    } else {
      conservados.push(v)
    }
  }
  result.criteriaMatched = conservados
  result.criteriaMissing = missing
  return matched.length - conservados.length
}
