/**
 * Shared display formatters.
 *
 * Centralizes the `toLocaleDateString('es-PE', …)` / `Math.round(pct)`
 * snippets that were repeated 16+ times across dashboard, admin and lesson
 * components. Locale is fixed to es-PE to keep server/client output identical
 * (avoids the SSR hydration mismatch documented in CLAUDE.md).
 */

const LOCALE = 'es-PE'

/** "5 may" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
  })
}

/** "3:18 p. m." */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** "5 may, 3:18 p. m." */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`
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
