/**
 * Estado derivado de un kiosko (Assessment) según el periodo de su campaña.
 *
 * Regla: el kiosko hereda el periodo de su EventCampaign — se abre solo el
 * primer día y se cierra solo al terminar el último. `isActive` queda como
 * kill switch manual (cerrar de emergencia); ya no es el mecanismo principal.
 * Un kiosko sin campaña sigue dependiendo únicamente de `isActive`.
 *
 * Las fechas se comparan por día calendario en America/Lima (no por instante
 * UTC) para que el periodo sea inclusivo y coincida con las fechas que la UI
 * muestra al usuario (que formatea en hora local de Lima).
 *
 * Módulo puro sin dependencias — usable en server y client.
 */

const LIMA_TZ = 'America/Lima'

export type KioskoStatus = 'open' | 'scheduled' | 'ended' | 'closed'

/** Día calendario en Lima como "YYYY-MM-DD" (en-CA da ese formato). */
function limaDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TZ }).format(d)
}

export function getKioskoStatus(input: {
  isActive: boolean
  campaign?: { startDate: Date | string; endDate: Date | string } | null
}): KioskoStatus {
  if (!input.isActive) return 'closed'
  if (!input.campaign) return 'open'

  const today = limaDay(new Date())
  if (today < limaDay(new Date(input.campaign.startDate))) return 'scheduled'
  if (today > limaDay(new Date(input.campaign.endDate))) return 'ended'
  return 'open'
}

/** Fecha legible para el mensaje "Disponible a partir del …" del kiosko. */
export function formatKioskoDate(date: Date | string, locale: 'ES' | 'EN'): string {
  return new Intl.DateTimeFormat(locale === 'EN' ? 'en-US' : 'es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: LIMA_TZ,
  }).format(new Date(date))
}
