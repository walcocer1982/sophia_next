/**
 * Qué lecciones ve un alumno en su inicio (/lessons).
 *
 * 26 oct 2026: una lección cuya ventana cerró ya no está en su lista.
 * 27 oct 2026 (Walther: «aparecen otros cursos que ya no están programados»):
 * tampoco las de un curso donde no está matriculado o que su sección no
 * programó. Una alumna de EOM A veía Tutoría (sin matrícula ni horario) y dos
 * cursos borrados (esos se filtran en la consulta). Ve solo lo de su sección
 * con fecha, abierto o por venir. Instructores y administradores ven todo.
 */
export function programadaParaElAlumno(l: {
  /** Su sección activa en el curso de la lección, si está matriculado. */
  seccionDelAlumno: string | null
  /** El horario de esa sección para la lección. */
  horario: { availableAt: Date | null } | null
  /** La ventana ya cerró (por hora o porque el instructor terminó el bloque). */
  cerrada: boolean
}): boolean {
  return !!l.seccionDelAlumno && !!l.horario?.availableAt && !l.cerrada
}
