// Formato de fechas y horas para la programación de lecciones.

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short',
  })
}
export function todayISO() { return new Date().toISOString().slice(0, 10) }
export function isoToInputDate(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

// ── Helpers de hora para programar lecciones con hora de inicio/cierre ──
// Fecha (YYYY-MM-DD) + hora local (HH:mm) → ISO UTC (el browser interpreta
// el string sin zona como hora LOCAL del usuario).
export function toLocalISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}
// Horas enteras (mín 1, redondeo hacia arriba) entre dos HH:mm del mismo día.
// 0 = inválido (cierre no es posterior al inicio).
export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? Math.max(1, Math.ceil(diff / 60)) : 0
}
// HH:mm local de un ISO
export function localTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
// HH:mm local del cierre (availableAt + closesAfterHours)
export function closeTime(iso: string, hours: number): string {
  return localTime(new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString())
}

/** Estado visual de una sección según sus fechas: futura, en curso, terminada */
export function getSectionDateStatus(startDate: string | null, endDate: string | null): {
  label: string
  className: string
} | null {
  if (!startDate && !endDate) return null
  const now = Date.now()
  const start = startDate ? new Date(startDate).getTime() : null
  const end = endDate ? new Date(endDate).getTime() : null
  if (end && now > end) return { label: 'Terminada', className: 'bg-gray-100 text-gray-600 border-gray-300' }
  if (start && now < start) return { label: 'Por iniciar', className: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { label: 'En curso', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}
