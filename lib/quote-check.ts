/**
 * ¿Lo que el alumno «cita» existe en el material del panel? (spec §8, quoteFrom)
 *
 * En LEC-MAN la actividad pide «lista cuatro frases del fragmento que sí
 * subrayarías». El verificador solo exigía una cita del ALUMNO para cada
 * criterio cubierto; no podía saber si esas frases estaban en el fragmento.
 * Aquí el código parte el bloque en frases y busca en lo que escribió el
 * alumno al menos tres palabras seguidas de cada una. El código solo descarta
 * un criterio que el modelo dio por cubierto; nunca aprueba uno por su cuenta.
 */
import type { SupportBlock } from '@/types/lesson'

export interface QuoteRule {
  /** Índice 1-based en must_include. */
  criterion: number
  /** id del bloque del que deben salir las frases. */
  block: string
  /** Cuántas frases distintas del bloque deben aparecer (por defecto 1). */
  min?: number
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim()

/** Las frases citables de un bloque: oraciones de un texto, filas de una tabla, hechos de un caso. */
export function frasesDelBloque(b: SupportBlock): string[] {
  switch (b.type) {
    case 'text':
      return b.body
        .split(/\n+|(?<=[.;:!?])\s+/)
        .map((f) => f.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').replace(/\*\*/g, '').trim())
        .filter((f) => f.split(/\s+/).length >= 2)
    case 'table':
      return b.rows.map((r) => r.join(' ')).filter(Boolean)
    case 'case':
      return b.facts
    case 'formula':
      return [b.expression, ...(b.terms ?? []).map((t) => `${t.symbol} ${t.meaning}`)]
    default:
      return []
  }
}

/** Texto completo de un bloque para dárselo al verificador. */
export function textoParaVerificador(b: SupportBlock): string {
  switch (b.type) {
    case 'text':
      return b.body
    case 'table':
      return [b.columns.join(' | '), ...b.rows.map((r) => r.join(' | '))].join('\n')
    case 'case':
      return `${b.name}: ${b.facts.join(' · ')}`
    case 'formula':
      return `${b.expression}${b.terms?.length ? ` (${b.terms.map((t) => `${t.symbol} = ${t.meaning}`).join('; ')})` : ''}`
    default:
      return ''
  }
}

/** Ventanas de tres palabras seguidas de un texto normalizado. */
function trigramas(texto: string): Set<string> {
  const w = normalizar(texto).split(' ').filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`)
  return out
}

/**
 * Frases del bloque que aparecen en lo que escribió el alumno: basta que el
 * alumno repita tres palabras seguidas de la frase (tolera que recorte o
 * cambie el resto). Devuelve las frases encontradas, sin repetir.
 */
export function frasesCitadas(textosDelAlumno: string[], bloque: SupportBlock): string[] {
  const delAlumno = trigramas(textosDelAlumno.join(' \n '))
  return frasesDelBloque(bloque).filter((frase) => {
    const t = trigramas(frase)
    // Una frase de dos palabras («Halar seguro») no tiene trigramas: se pide entera.
    if (t.size === 0) return ` ${normalizar(textosDelAlumno.join(' '))} `.includes(` ${normalizar(frase)} `)
    for (const g of t) if (delAlumno.has(g)) return true
    return false
  })
}

/**
 * Aplica las reglas de citas del bloque sobre el resultado del verificador:
 * un criterio cubierto cuyas frases no alcanzan el mínimo pasa a «falta».
 * Muta `result` y devuelve cuántos criterios descartó.
 */
export function exigirCitasDelBloque(
  result: { criteriaMatched?: unknown; criteriaMissing?: unknown },
  rules: QuoteRule[] | undefined,
  mustInclude: string[],
  material: SupportBlock[],
  textosDelAlumno: string[],
): number {
  if (!rules?.length) return 0
  const matched = Array.isArray(result.criteriaMatched) ? [...result.criteriaMatched] : []
  const missing = Array.isArray(result.criteriaMissing) ? [...result.criteriaMissing] : []
  let descartados = 0
  for (const regla of rules) {
    const texto = mustInclude[regla.criterion - 1]
    const pos = matched.findIndex((v) => v === regla.criterion || v === texto)
    if (pos < 0) continue
    const bloque = material.find((b) => b.id === regla.block)
    if (!bloque) {
      // Sin el bloque no se puede comprobar: se registra y no se toca.
      console.warn('⚠️  verifier.quote_block_missing', { bloque: regla.block })
      continue
    }
    const encontradas = frasesCitadas(textosDelAlumno, bloque)
    if (encontradas.length < (regla.min ?? 1)) {
      missing.push(matched[pos])
      matched.splice(pos, 1)
      descartados++
      console.warn('⚠️  verifier.quote_not_in_block', { criterio: texto, bloque: regla.block, encontradas: encontradas.length, minimo: regla.min ?? 1 })
    }
  }
  result.criteriaMatched = matched
  result.criteriaMissing = missing
  return descartados
}
