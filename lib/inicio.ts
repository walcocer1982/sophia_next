/**
 * La «casa» de cada rol: adonde llega al entrar y adonde lo devuelve el logo.
 * El alumno vive en sus clases; el personal, en la programación (14 oct 2026:
 * antes el login mandaba a todos a /lessons y el proxy al personal a /planner,
 * que los instructores no pueden abrir).
 */
export function inicioPorRol(role: string | null | undefined): string {
  return !role || role === 'STUDENT' ? '/lessons' : '/programacion'
}
