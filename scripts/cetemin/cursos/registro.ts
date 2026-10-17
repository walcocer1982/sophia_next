/**
 * Qué cursos y sesiones conoce el canal de carga. Una sesión nueva = un archivo
 * `cursos/<curso>/s<n>.ts` y una línea aquí.
 */
import type { CursoSpec, SesionSpec } from '../tipos'
import { SI_ALTORIESGO } from './si-altoriesgo/curso'
import { S1 as SI_ALTORIESGO_S1 } from './si-altoriesgo/s1'

export const REGISTRO: Record<string, { curso: CursoSpec; sesiones: Record<number, SesionSpec> }> = {
  'si-altoriesgo': { curso: SI_ALTORIESGO, sesiones: { 1: SI_ALTORIESGO_S1 } },
}
