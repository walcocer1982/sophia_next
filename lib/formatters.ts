/**
 * Shared display formatters.
 *
 * Centralizes the `toLocaleDateString('es-PE', …)` / `Math.round(pct)`
 * snippets that were repeated 16+ times across dashboard, admin and lesson
 * components. Locale is fixed to es-PE to keep server/client output identical
 * (avoids the SSR hydration mismatch documented in CLAUDE.md).
 *
 * La zona horaria también va fija (15 oct 2026): las páginas de servidor del
 * Monitor formateaban con la zona del proceso, y en Vercel eso es UTC. Una
 * sesión de las 8 de la noche salía con fecha del día siguiente y «cierra
 * 10:00 p. m.» se leía «3:00 a. m.». Con la zona explícita, servidor y
 * navegador dicen lo mismo estén donde estén.
 */

const LOCALE = 'es-PE'
export const ZONA = 'America/Lima'

/** "5 may" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: ZONA,
  })
}

/** "5 de mayo" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    timeZone: ZONA,
  })
}

/** "3:18 p. m." */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONA,
  })
}

/** "5 may, 3:18 p. m." */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`
}

/** «hace 3 h», «hace 2 d», «hace 20 min». */
export function hace(date: string | Date, ahora: Date = new Date()): string {
  const ms = ahora.getTime() - new Date(date).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 60) return `hace ${Math.max(min, 0)} min`
  const h = Math.round(min / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

/** Rounded integer percentage, e.g. 87. Returns 0 when total is 0. */
export function percentage(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

/** Tailwind bg class for a 0-100 progress value. */
export function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 50) return 'bg-blue-500'
  if (pct >= 30) return 'bg-amber-500'
  return 'bg-red-400'
}
