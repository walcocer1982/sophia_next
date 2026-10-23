/**
 * Canal único de carga de sesiones de CETEMIN en Sophia (decisión de Walther,
 * 15 oct 2026: «todas las cargas van a ser por este medio»).
 *
 * Una sesión se describe con estos datos y nada más; las actividades las
 * construyen las plantillas (`plantillas.ts`), el validador (`validar.ts`)
 * bloquea lo que no cumple las reglas de clase y `cargar.ts` escribe en la
 * base. Después de probar, `auditar-sesion.ts` revisa la transcripción.
 *
 * Fuente de los datos: SOLO `05_Base-de-datos` del proyecto diseño-ppt-cetemin
 * (solo lectura). Lo que falte se pide allá, no se saca de los guiones.
 */
import type { ClassifyBlock, ImageBlock, LessonContent } from '../../types/lesson'

/** Una imagen aprobada de `imagenes.csv`. `description` lleva el texto escrito en ella: Sophia no ve imágenes. */
export interface ImagenSpec {
  id: string
  archivo: string
  description: string
  source: string
  license: string
  kind: ImageBlock['kind']
}

export interface CursoSpec {
  slug: string
  title: string
  capacidad: string
  instructor: string
  carreraId: string
  userId: string
}

/** Rutina de entrada Veo · Pienso · Me pregunto, con las preguntas TAL COMO ESTÁN ESCRITAS en la imagen. */
export interface RutinaSpec {
  imagenId: string
  tituloImagen: string
  /** Cómo se le nombra la imagen al alumno: «fotografía» (por defecto), «figura», «esquema». */
  tipoImagen?: string
  fuente?: string
  preguntas: { veo: string; pienso: string; mePregunto: string }
  titulos: { veo: string; pienso: string; mePregunto: string }
  /** Qué preguntar si no describe nada («dónde está parada la gente de la foto»). */
  pistaVeo?: string
  /**
   * Qué tiene que traer la respuesta en Pienso y en Me pregunto (pasos sin nota).
   * Sin esto, criterios genéricos. (22 oct 2026: antes estaban escritos para
   * «caídas», y solo servían en SI-ALTORIESGO.)
   */
  criterios?: { pienso?: string[]; mePregunto?: string[] }
  /** Cómo se enlaza Me pregunto con lo dicho en Pienso. Por defecto, «Sobre lo que dijiste en el paso anterior:». */
  enlaceMePregunto?: string
}

export interface NormaSpec {
  id: string
  title: string
  source: string
  body: string
}

/** Un punto clave: Sophia ENSEÑA primero (regla + ejemplo resuelto propio) y recién después hace UNA pregunta abierta. */
export interface PuntoClaveSpec {
  id: string
  title: string
  subtitle: string
  keyPointIndex: number
  lamina: { imagenId: string; title: string }
  norma: NormaSpec
  apoyo?: { imagenId: string; title: string }[]
  /** Una a tres frases. Va dentro de la instrucción de Sophia: corta. */
  regla: string
  /** El ejemplo que Sophia resuelve antes de preguntar. Propio: nunca de los casos del equipo. */
  ejemplo: string
  /** Palabra que identifica el ejemplo en la transcripción (la busca el auditor). */
  ejemploClave: string
  /**
   * Tarjetas para ubicar en la pizarra antes de responder (bloque «clasificar»):
   * la ubicación es la decisión y prueba que leyó; la razón la escribe. Opcional.
   */
  clasificar?: Omit<ClassifyBlock, 'type' | 'showWhen' | 'pinned'>
  /**
   * El texto de la norma se puede subrayar. `respalda`: un fragmento de la línea
   * que respalda la respuesta (o varios, si más de una línea la respalda). El
   * código compara contra ellas. Obligatorio en todo punto clave (validar.ts).
   */
  subrayar?: { respalda: string | string[] }
  /** UNA pregunta sobre una situación propia: una decisión con su porqué. */
  pregunta: string
  criterios: string[]
  critical?: number[]
  commonMistakes?: string[]
}

/** Caso corto gemelo del caso de la sesión: mismo rubro y estructura, otra situación, una sola decisión. */
export interface CasoCortoSpec {
  id: string
  title: string
  subtitle: string
  keyPointIndex: number
  caso: {
    id: string
    title: string
    /** Cómo lo nombra la pregunta: «el caso del entrepiso». */
    referencia: string
    name: string
    source: string
    facts: string[]
    question: string
  }
  /** Qué preguntar si decide mal o a medias. */
  pistas: string
  criterios: string[]
  critical?: number[]
  commonMistakes?: string[]
}

export interface SesionSpec {
  slug: string
  order: number
  /** Etiqueta del banco de imágenes: «S1». */
  etiqueta: string
  /** Prefijo de los ids de actividad: «altoriesgo-s1». */
  idPrefijo: string
  title: string
  objective: string
  keyPoints: string[]
  imagenes: ImagenSpec[]
  /** Nombres y lugares de los casos del equipo. No pueden aparecer en ningún texto de Sophia. */
  casosDelEquipo: string[]
  rutina: RutinaSpec
  puntosClave: PuntoClaveSpec[]
  casoCorto: CasoCortoSpec
  cierre?: { title?: string; subtitle?: string }
  contexto: LessonContent['context']
}

export type Subida = Record<string, { url: string; bankId: string }>
