import type { UnderstandingLevel } from '@/types/lesson'
import { normalizeLevel } from '@/lib/levels'

/**
 * Nivel reconocido, o null. A diferencia de normalizeLevel —que devuelve
 * 'developing' ante cualquier cosa— acá un valor desconocido se propaga como
 * ausencia, para que un fallo del verificador se vea como un fallo y no como
 * una clase entera en «en proceso».
 */
function strictLevel(v: unknown): UnderstandingLevel | null {
  if (typeof v !== 'string') return null
  const conocidos = ['beginning', 'developing', 'achieved', 'outstanding',
    'memorized', 'understood', 'applied', 'analyzed']
  return conocidos.includes(v) ? normalizeLevel(v) : null
}

/**
 * Fórmula de calificación. Único punto de cálculo de la nota 0-100.
 *
 * UNA SOLA ESCALA (14 set 2026). Cada nivel de actividad vale el punto medio
 * de su banda en la política de evaluación (ver lib/rubric.ts), así el mismo
 * número se lee igual en la actividad y en la lección:
 *
 *   beginning   → 12.5   (En inicio:   0 a < 25)
 *   developing  → 37.5   (En proceso: 25 a < 50)
 *   achieved    → 62.5   (Logrado:    50 a < 75)   ← aprobado
 *   outstanding → 87.5   (Destacado:  75 a 100)
 *
 * Consecuencias que antes no se cumplían:
 *   - «Logrado» en todas las actividades da «Logrado» en la lección (antes daba
 *     «Logrado destacado», porque 75 caía en la banda de arriba).
 *   - Agotar los intentos sin cumplir criterios queda en «En proceso» (37.5),
 *     que NO aprueba (antes el tope era 50 = nota de aprobación).
 *   - Un criterio eliminatorio nunca cubierto deja la actividad en «En inicio».
 *
 * Por actividad: el MEJOR intento con nivel legible, × penalidad por intentos
 * relativa a los que la actividad permite. Por lección: promedio ponderado por
 * tipo de actividad (o por el peso que fijó el diseñador).
 */
export const COMPREHENSION_SCORES: Record<UnderstandingLevel, number> = {
  beginning: 12.5,
  developing: 37.5,
  achieved: 62.5,
  outstanding: 87.5,
}

/** Minimal shape needed to score an activity. Compatible con ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
  /** Tipo de actividad — usado para asignar peso default si no hay override. */
  activityType?: 'explanation' | 'practice' | 'reflection' | 'closing'
  /** Override manual del peso (1-10). Si no se setea, se usa el default por tipo. */
  weight?: number | null
  /** false = avanzó por límite de intentos sin cumplir criterios. */
  passedCriteria?: boolean | null
  /** Intentos que la actividad permite. Calibra la penalidad. */
  maxAttempts?: number | null
  /**
   * Textos de los criterios ELIMINATORIOS de la actividad (los must_include
   * marcados en success_criteria.critical). Si alguno no aparece cubierto en
   * ningún intento, la actividad queda en «En inicio».
   */
  criticalCriteria?: string[] | null
}

/** Peso default por tipo de actividad en el promedio ponderado de la lección.
 *
 * Las primeras actividades suelen ser de activación/exposición (peso bajo);
 * las últimas son de aplicación + síntesis (peso alto). El diseñador puede
 * override con el campo `weight` por actividad.
 */
const DEFAULT_WEIGHT_BY_TYPE: Record<NonNullable<ScorableActivity['activityType']>, number> = {
  explanation: 1, // activación / exposición — pesa menos
  reflection: 2,  // categorización / pensar sin aplicar
  practice: 3,    // aplicación concreta — donde se ve si entendió
  closing: 4,     // síntesis final — integra todo
}

/**
 * Peso efectivo de una actividad para el promedio ponderado.
 *
 * `ignorarOverride` existe para un solo caso: cuando TODAS las actividades de
 * una lección tienen weight 0 (pasó en la S0 de tutoría: la nota salía 0 o
 * nula). Ahí se vuelve a los pesos por tipo en vez de no calificar a nadie.
 */
export function getActivityWeight(ap: ScorableActivity, ignorarOverride = false): number {
  if (!ignorarOverride && typeof ap.weight === 'number' && ap.weight >= 0) return ap.weight
  if (ap.activityType && DEFAULT_WEIGHT_BY_TYPE[ap.activityType]) {
    return DEFAULT_WEIGHT_BY_TYPE[ap.activityType]
  }
  return 1 // fallback si no hay tipo conocido
}

type IntentoGuardado = {
  analysis?: {
    understanding_level?: string
    completeness_percentage?: number
    criteriaMatched?: string[]
    unverified?: boolean
  }
}

function intentosDe(ap: ScorableActivity): IntentoGuardado[] {
  const evidence = ap.evidenceData as { attempts?: IntentoGuardado[] } | null
  return evidence?.attempts || []
}

/**
 * Score (0-100) de una actividad, o null si no hay evidencia legible.
 *
 * 1) Mejor intento con nivel legible (un intento sin verificar no cuenta).
 * 2) Contradicción «logrado con < 40 % de completitud» → baja a proceso.
 * 3) Agotó los intentos sin cumplir criterios → tope «En proceso» (no aprueba).
 * 4) Criterio eliminatorio nunca cubierto → tope «En inicio».
 * 5) × penalidad por intentos, relativa a los permitidos.
 */
export function activityScore(ap: ScorableActivity): number | null {
  const attempts = intentosDe(ap)
  if (attempts.length === 0) return null

  // Nivel ESTRICTO: un valor que no reconocemos es un fallo del verificador, no
  // un alumno mediocre. Antes normalizeLevel devolvía 'developing' en silencio,
  // así que un enum cambiado o una respuesta en español bajaba a toda la clase
  // a «en proceso» sin que nadie se enterara.
  const puntajes: number[] = []
  for (const att of attempts) {
    if (att.analysis?.unverified) continue
    const nivel = strictLevel(att.analysis?.understanding_level)
    if (!nivel) continue

    let score = COMPREHENSION_SCORES[nivel]

    // Coherencia entre los dos campos que el verificador devuelve. «Logrado con
    // 0% de completitud» es una contradicción: en junio hubo 2.400 intentos así
    // y la fórmula los tradujo a 75. Ante la contradicción gana el número, que
    // es más difícil de inventar que la etiqueta.
    const pct = att.analysis?.completeness_percentage
    if (typeof pct === 'number' && score >= COMPREHENSION_SCORES.achieved && pct < 40) {
      score = COMPREHENSION_SCORES.developing
    }
    puntajes.push(score)
  }
  if (puntajes.length === 0) return null

  const maxScore = Math.max(...puntajes)

  // Un solo estimador: el mejor intento, siempre. Antes se usaba el máximo si
  // llegaba a 75 y el promedio si no, así que [25,25,75] daba 64 y [25,25,50]
  // daba 33 — treinta y un puntos de salto por una etiqueta.
  let score = maxScore

  // Avanzar no es aprobar: quien agotó los intentos sin cumplir un criterio
  // recibió una decisión pedagógica —que no se trabe—, no un logro.
  //
  // El tope exige las DOS condiciones porque `passedCriteria` tiene default
  // false en el esquema: en los registros viejos ese false significa «nunca se
  // escribió», no «no cumplió». Aplicarlo a secas aplastó a Química entre 38 y
  // 50 —menos discriminación que antes de tocar nada—. Con los intentos
  // agotados como segunda condición, el avance forzado queda identificado sin
  // castigar datos que nadie llenó.
  const permitidos = ap.maxAttempts && ap.maxAttempts > 0 ? ap.maxAttempts : 5
  if (ap.passedCriteria === false && ap.attempts >= permitidos) {
    score = Math.min(score, COMPREHENSION_SCORES.developing)
  }

  // Eliminatorios: lo que en campo no admite error. Si nunca lo cubrió, la
  // actividad no está lograda por más que el resto esté bien.
  const criticos = ap.criticalCriteria ?? []
  if (criticos.length > 0) {
    const cubiertos = new Set<string>()
    for (const att of attempts) {
      for (const c of att.analysis?.criteriaMatched ?? []) cubiertos.add(c)
    }
    if (criticos.some((c) => !cubiertos.has(c))) {
      score = Math.min(score, COMPREHENSION_SCORES.beginning)
    }
  }

  return Math.round(score * attemptPenalty(ap, puntajes, maxScore))
}

/**
 * Penalidad por intentos, relativa a los que la actividad PERMITE.
 *
 * El umbral fijo anterior (5+ intentos → ×0.85) castigaba lo normal: en el
 * corpus las actividades de cierre promedian 5-7 intentos, y el límite de
 * avance forzado es 5. Ahora se mide contra el max_attempts de la propia
 * actividad, que es un número que el diseñador eligió para ESE ejercicio.
 */
function attemptPenalty(
  ap: ScorableActivity,
  puntajes: number[],
  maxScore: number
): number {
  const permitidos = ap.maxAttempts && ap.maxAttempts > 0 ? ap.maxAttempts : 5
  const usados = puntajes.findIndex((s) => s === maxScore) + 1
  const fraccion = usados / permitidos

  if (fraccion <= 0.5) return 1.0
  if (fraccion <= 0.8) return 0.95
  return 0.9
}

/** Suma de pesos; si todos son 0 por diseño, vuelve a los pesos por tipo. */
function sumaDePesos(activities: ScorableActivity[]): { total: number; ignorarOverride: boolean } {
  const total = activities.reduce((sum, ap) => sum + getActivityWeight(ap), 0)
  if (total > 0 || activities.length === 0) return { total, ignorarOverride: false }
  return {
    total: activities.reduce((sum, ap) => sum + getActivityWeight(ap, true), 0),
    ignorarOverride: true,
  }
}

/**
 * Weighted grade across activities, rounded to an integer 0-100.
 *
 * Promedio ponderado: cada actividad aporta `score × weight`, dividido por la
 * suma de pesos. Si ninguna actividad tiene weight/activityType, el resultado
 * es idéntico al promedio simple anterior (todas pesan 1).
 *
 * @param activities  Activities to evaluate. Cada una contribuye con su peso.
 * @param denominator Override del denominador (suma de pesos). Útil para
 *        penalizar sesiones incompletas: pasás la suma de pesos ESPERADA
 *        aunque algunas actividades no se hayan completado todavía.
 */
export function calculateGrade(
  activities: ScorableActivity[],
  denominator?: number,
): number | null {
  if (activities.length === 0 && (denominator ?? 0) <= 0) return null

  // Una actividad sin nivel legible no se puntúa: no aporta ni al numerador ni
  // al denominador. Si NINGUNA es puntuable, no hay nota — mejor una sesión sin
  // calificar que un número inventado sobre evidencia rota.
  const puntuables = activities.filter((ap) => activityScore(ap) !== null)
  if (puntuables.length === 0) return null

  const { total, ignorarOverride } = sumaDePesos(puntuables)

  const weightedSum = puntuables.reduce(
    (sum, ap) => sum + (activityScore(ap) ?? 0) * getActivityWeight(ap, ignorarOverride),
    0,
  )

  const totalWeight = denominator ?? total

  if (totalWeight <= 0) return null
  return Math.round(weightedSum / totalWeight)
}

/**
 * Grade for the CODE methodology: binary completion, no comprehension rubric.
 * Simply the percentage of expected steps the student completed (0-100).
 */
export function calculateCompletionGrade(
  completed: number,
  total: number,
): number {
  if (total <= 0) return 0
  return Math.round((Math.min(completed, total) / total) * 100)
}

/** Actividad tal como viene en contentJson, en lo que importa para calificar. */
export type ActividadDelPlan = {
  id: string
  type?: string
  weight?: number | null
  verification?: {
    is_evaluative?: boolean
    max_attempts?: number
    success_criteria?: { must_include?: string[]; critical?: number[] }
  }
}

/** Registro de progreso tal como sale de Prisma. */
export type ProgresoGuardado = {
  activityId: string
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
  passedCriteria?: boolean | null
}

/** Textos de los criterios eliminatorios de una actividad del plan. */
export function criteriosEliminatorios(a: ActividadDelPlan | undefined): string[] {
  const sc = a?.verification?.success_criteria
  if (!sc?.critical?.length || !sc.must_include?.length) return []
  return sc.critical
    .map((i) => sc.must_include![i - 1])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
}

/**
 * Une el progreso guardado con lo que el plan dice de esa actividad, para que
 * la nota, el tablero y la ficha del alumno puntúen con los mismos datos.
 */
export function enriquecerConPlan(
  p: ProgresoGuardado,
  a: ActividadDelPlan | undefined
): ScorableActivity {
  return {
    attempts: p.attempts,
    tangentCount: p.tangentCount,
    evidenceData: p.evidenceData,
    passedCriteria: p.passedCriteria,
    activityType: a?.type as ScorableActivity['activityType'],
    weight: a?.weight,
    maxAttempts: a?.verification?.max_attempts,
    criticalCriteria: criteriosEliminatorios(a),
  }
}

/** true si hay intentos guardados pero ninguno con nivel legible. */
function sinVerificar(ap: ScorableActivity): boolean {
  return intentosDe(ap).length > 0 && activityScore(ap) === null
}

/**
 * La nota de una sesión. ÚNICO punto donde se calcula.
 *
 * Había tres: chat/stream (sin pesos ni denominador), voice/message (igual) y
 * eval/finish (con ambos). O sea, tres notas distintas para el mismo alumno
 * según por dónde entrara.
 *
 * Devuelve null cuando la evidencia no permite afirmar nada. La sesión se cierra
 * igual; lo que no se hace es inventarle un número.
 */
export function notaDeLaSesion(
  actividadesDelPlan: ActividadDelPlan[],
  progreso: ProgresoGuardado[],
  metodologia: 'CODE' | 'REFLECTIVE' | string | null | undefined
): number | null {
  const meta = new Map(actividadesDelPlan.map((a) => [a.id, a]))
  const esEvaluativa = (id: string) => meta.get(id)?.verification?.is_evaluative !== false

  const evaluativas = progreso.filter((p) => esEvaluativa(p.activityId))
  const totalEvaluativas = actividadesDelPlan.filter(
    (a) => a.verification?.is_evaluative !== false
  ).length

  // CODE mide avance, no comprensión: es el porcentaje de pasos cumplidos.
  if (metodologia === 'CODE') {
    return calculateCompletionGrade(evaluativas.length, totalEvaluativas)
  }

  const enriquecidas = evaluativas.map((p) => enriquecerConPlan(p, meta.get(p.activityId)))

  // Una actividad que el verificador no pudo calificar (API caída) no es culpa
  // del alumno: sale del denominador hasta que se re-verifique.
  const sinVerificarIds = new Set(
    evaluativas.filter((p, i) => sinVerificar(enriquecidas[i])).map((p) => p.activityId)
  )

  // Denominador = pesos ESPERADOS de todas las evaluativas de la lección, no
  // solo de las completadas: dejar tres actividades sin hacer debe pesar.
  const esperadas: ScorableActivity[] = actividadesDelPlan
    .filter((a) => a.verification?.is_evaluative !== false && !sinVerificarIds.has(a.id))
    .map((a) => ({
      attempts: 0,
      evidenceData: null,
      activityType: a.type as ScorableActivity['activityType'],
      weight: a.weight,
    }))
  const { total: denominador } = sumaDePesos(esperadas)

  return calculateGrade(enriquecidas, denominador)
}
