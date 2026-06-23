/**
 * Niveles de logro — capa de compatibilidad (Fase C).
 *
 * El enum pasó de la escala cognitiva (memorized/understood/applied/analyzed)
 * a la escala de logro en inglés (beginning/developing/achieved/outstanding),
 * que mapea 1:1 al español inicio/proceso/logrado/destacado.
 *
 * Los registros históricos en DB tienen los nombres viejos. NO migramos la DB:
 * `normalizeLevel()` traduce al leer (idempotente). Usar SIEMPRE al leer un
 * nivel que pueda venir de datos viejos (scoring, dashboard, attempts) y al
 * normalizar la salida del verificador.
 */

import type { UnderstandingLevel } from '@/types/lesson'

const LEGACY_MAP: Record<string, UnderstandingLevel> = {
  // viejos → nuevos
  memorized: 'beginning',
  understood: 'developing',
  applied: 'achieved',
  analyzed: 'outstanding',
  // nuevos → nuevos (idempotente)
  beginning: 'beginning',
  developing: 'developing',
  achieved: 'achieved',
  outstanding: 'outstanding',
}

/** Normaliza cualquier valor de nivel (viejo o nuevo) al enum nuevo. Default: developing. */
export function normalizeLevel(v: unknown): UnderstandingLevel {
  return (typeof v === 'string' && LEGACY_MAP[v]) || 'developing'
}

/** Etiqueta en español por nivel (para UI/dashboard). */
export const LEVEL_LABEL_ES: Record<UnderstandingLevel, string> = {
  beginning: 'En inicio',
  developing: 'En proceso',
  achieved: 'Logrado',
  outstanding: 'Destacado',
}

/**
 * Keyword legado (viejo) por nivel nuevo. Solo para mostrar el nivel esperado
 * dentro del prompt de verificación FALLBACK, cuyo texto sigue en nombres
 * viejos (no lo tocamos para no arriesgar la calibración validada).
 */
export const LEGACY_LABEL: Record<UnderstandingLevel, string> = {
  beginning: 'memorized',
  developing: 'understood',
  achieved: 'applied',
  outstanding: 'analyzed',
}
