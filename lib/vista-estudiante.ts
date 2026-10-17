/**
 * «Probar como estudiante» (13 oct 2026): la sesión de prueba del instructor,
 * mostrada como la ve un alumno. Sin el menú de instructor, con las reglas del
 * curso (pegar texto, imágenes sin validar ocultas) y con los controles de la
 * prueba reducidos a una franja chica.
 *
 * Va en la dirección (`/learn/<id>?vista=estudiante`) para que recargar, saltar
 * o reiniciar la prueba no saquen de la vista. Solo vale en sesiones de prueba:
 * en una sesión real no cambia nada. La sesión sigue siendo de prueba y del
 * instructor; no ensucia el Monitor ni las notas.
 */
export const PARAM_VISTA = 'vista'
export const VISTA_ESTUDIANTE = 'estudiante'

export function esVistaEstudiante(valor: string | string[] | null | undefined): boolean {
  return (Array.isArray(valor) ? valor[0] : valor) === VISTA_ESTUDIANTE
}

/** Dirección de una sesión de prueba, con o sin la vista de estudiante. */
export function urlDeLaPrueba(sessionId: string, comoEstudiante: boolean): string {
  return comoEstudiante ? `/learn/${sessionId}?${PARAM_VISTA}=${VISTA_ESTUDIANTE}` : `/learn/${sessionId}`
}
