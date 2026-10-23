/**
 * Qué cursos y sesiones conoce el canal de carga. Una sesión nueva = un archivo
 * `cursos/<curso>/s<n>.ts` y una línea aquí.
 */
import type { CursoSpec, SesionSpec } from '../tipos'
import { SI_ALTORIESGO } from './si-altoriesgo/curso'
import { S1 as SI_ALTORIESGO_S1 } from './si-altoriesgo/s1'
import { S2 as SI_ALTORIESGO_S2 } from './si-altoriesgo/s2'
import { S3 as SI_ALTORIESGO_S3 } from './si-altoriesgo/s3'
import { EOM_SOST } from './eom-sost/curso'
import { S1 as EOM_SOST_S1 } from './eom-sost/s1'
import { S2 as EOM_SOST_S2 } from './eom-sost/s2'
import { S3 as EOM_SOST_S3 } from './eom-sost/s3'
import { PM_FMPLANTA } from './pm-fmplanta/curso'
import { S1 as PM_FMPLANTA_S1 } from './pm-fmplanta/s1'
import { S2 as PM_FMPLANTA_S2 } from './pm-fmplanta/s2'
import { S3 as PM_FMPLANTA_S3 } from './pm-fmplanta/s3'

export const REGISTRO: Record<string, { curso: CursoSpec; sesiones: Record<number, SesionSpec> }> = {
  'si-altoriesgo': { curso: SI_ALTORIESGO, sesiones: { 1: SI_ALTORIESGO_S1, 2: SI_ALTORIESGO_S2, 3: SI_ALTORIESGO_S3 } },
  'eom-sost': { curso: EOM_SOST, sesiones: { 1: EOM_SOST_S1, 2: EOM_SOST_S2, 3: EOM_SOST_S3 } },
  'pm-fmplanta': { curso: PM_FMPLANTA, sesiones: { 1: PM_FMPLANTA_S1, 2: PM_FMPLANTA_S2, 3: PM_FMPLANTA_S3 } },
}
