/**
 * Título de la lección para el alumno: sin el código interno con que se nombra
 * en el planner («EVA-NOTA · Asistencia…», «S0 — Construye tu plan»,
 * «LEC-MAN · Lectura…»). El código sigue en el título guardado; solo se quita
 * al mostrarlo en la pantalla de la lección.
 */
export function tituloParaAlumno(titulo: string): string {
  const limpio = titulo.replace(/^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9-]{0,11}\s*[·—–:-]\s+/u, '').trim()
  return limpio.length >= 4 ? limpio : titulo
}
