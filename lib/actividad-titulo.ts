/**
 * Título legible de una actividad, para pantallas de instructor.
 *
 * Las actividades no tienen campo `title`. Se venía usando
 * `teaching.agent_instruction`, que es la INSTRUCCIÓN INTERNA para Sophia
 * («Pide ayuda al estudiante: tienes el caso de un alumno del ciclo pasado…»):
 * el instructor veía el guion, no el contenido.
 *
 * `verification.question` sí es texto que el alumno lee, así que es lo que
 * corresponde mostrar. Si no hay, se cae a «Actividad N» — un rótulo genérico
 * es mejor que filtrar el prompt.
 */
export function tituloActividad(
  actividad: { verification?: { question?: string } } | null | undefined,
  indice: number,
  max = 90
): string {
  const q = actividad?.verification?.question?.trim()
  if (!q) return `Actividad ${indice + 1}`
  return q.length > max ? `${q.slice(0, max).trimEnd()}…` : q
}
