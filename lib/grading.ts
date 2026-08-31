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
 * Centralized grading formula.
 *
 * Single source of truth para la calificación 0-100. La rúbrica
 * (Inicio/Proceso/Logrado/Destacado) se deriva de este número en lib/rubric.ts
 * vía gradeToRubricLevel().
 *
 * MODELO (2026-06-03 v3 — penalty por intentos):
 *
 * SI el estudiante alcanza Logrado (75) o Destacado (100) en algún intento:
 *   score = MEJOR nivel alcanzado × penalty por intentos hasta lograrlo
 *   Penalty:
 *     1-2 intentos: ×1.00  (primer error perdonado — humano)
 *     3 intentos:   ×0.95
 *     4 intentos:   ×0.90
 *     5+ intentos:  ×0.85
 *
 * SI nunca alcanza Logrado (max < 75):
 *   score = PROMEDIO de todos los intentos
 *   (refleja la consistencia en proceso/inicio)
 *
 * Grade final = PROMEDIO de scores de todas las actividades.
 *
 * Filosofía: premia a quien llega al objetivo (Logrado o Destacado), sin
 * castigar demasiado al que tarda 1-2 intentos en llegar. Quien se queda
 * en Proceso/Inicio promedia todo (no se beneficia ni perjudica).
 */

/** Nivel de dominio que devuelve el AI → score base.
 *
 * Escala discreta 0-25-50-75-100 alineada a los 4 niveles oficiales de
 * la rúbrica peruana (sin sub-categorías):
 *
 * - 25  = beginning    → Inicio    (errores conceptuales)
 * - 50  = developing   → Proceso   (comprende parcialmente)
 * - 75  = achieved     → Logrado   (cumple la mayoría de criterios)
 * - 100 = outstanding  → Destacado (va más allá)
 *
 * Para llegar a Logrado, el AI debe clasificar la respuesta como "achieved".
 * Los niveles se leen con normalizeLevel(), así que los registros históricos
 * (memorized/understood/applied/analyzed) puntúan igual que siempre.
 */
export const COMPREHENSION_SCORES: Record<UnderstandingLevel, number> = {
  beginning: 25,    // INICIO     (errores o no responde)
  developing: 50,   // PROCESO    (comprende parcialmente, le faltan elementos)
  achieved: 75,     // LOGRADO    (cumple la mayoría de criterios)
  outstanding: 100, // DESTACADO  (analiza, compara, evalúa)
}

/** Minimal shape needed to score an activity. Compatible con ActivityProgress. */
export type ScorableActivity = {
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
  /** Tipo de actividad — usado para asignar peso default si no hay override. */
  activityType?: 'explanation' | 'practice' | 'reflection' | 'closing'
  /** Override manual del peso (0-10). Si no se setea, se usa el default por tipo. */
  weight?: number | null
  /** false = avanzó por límite de intentos sin cumplir criterios. */
  passedCriteria?: boolean | null
  /** Intentos que la actividad permite. Calibra la penalidad. */
  maxAttempts?: number | null
}

/** Peso default por tipo de actividad en el promedio ponderado de la lección.
 *
 * Las primeras actividades suelen ser de activación/exposición (peso bajo);
 * las últimas son de aplicación + síntesis (peso alto). El diseñador puede
 * override con el campo `weight` por actividad. 0 = no aporta a la nota.
 */
const DEFAULT_WEIGHT_BY_TYPE: Record<NonNullable<ScorableActivity['activityType']>, number> = {
  explanation: 1, // activación / exposición — pesa menos
  reflection: 2,  // categorización / pensar sin aplicar
  practice: 3,    // aplicación concreta — donde se ve si entendió
  closing: 4,     // síntesis final — integra todo
}

/** Devuelve el peso efectivo de una actividad para el promedio ponderado. */
export function getActivityWeight(ap: ScorableActivity): number {
  if (typeof ap.weight === 'number' && ap.weight >= 0) return ap.weight
  if (ap.activityType && DEFAULT_WEIGHT_BY_TYPE[ap.activityType]) {
    return DEFAULT_WEIGHT_BY_TYPE[ap.activityType]
  }
  return 1 // fallback si no hay tipo conocido
}

/**
 * Score para una actividad. Dos caminos según si alcanzó Logrado/Destacado:
 *
 * 1) Alcanzó Logrado (75) o Destacado (100) en algún intento:
 *    score = mejor nivel × penalty por intentos hasta ese mejor nivel
 *    Premia llegar al objetivo, con tolerancia a 1-2 errores antes.
 *
 * 2) Nunca alcanzó Logrado (max < 75):
 *    score = promedio de todos los intentos
 *    Refleja la consistencia del estudiante en Proceso/Inicio.
 *
 * Penalty por tangentes (>3 ramas) sigue aplicando ×0.9 sobre el resultado.
 * Si no hay intentos registrados, score = 0.
 */
export function activityScore(ap: ScorableActivity): number | null {
  const evidence = ap.evidenceData as {
    attempts?: Array<{ analysis?: { understanding_level?: string; completeness_percentage?: number } }>
  } | null
  const attempts = evidence?.attempts || []
  if (attempts.length === 0) return null

  // Nivel ESTRICTO: un valor que no reconocemos es un fallo del verificador, no
  // un alumno mediocre. Antes normalizeLevel devolvía 'developing' en silencio,
  // así que un enum cambiado o una respuesta en español bajaba a toda la clase
  // a «en proceso» sin que nadie se enterara.
  const puntajes: number[] = []
  for (const att of attempts) {
    const bruto = att.analysis?.understanding_level
    const nivel = strictLevel(bruto)
    if (!nivel) continue

    let score = COMPREHENSION_SCORES[nivel]

    // Coherencia entre los dos campos que el verificador devuelve. «Logrado con
    // 0% de completitud» es una contradicción: en junio hubo 2.400 intentos así
    // y la fórmula los tradujo a 75. Ante la contradicción gana el número, que
    // es más difícil de inventar que la etiqueta.
    const pct = att.analysis?.completeness_percentage
    if (typeof pct === 'number' && score >= 75 && pct < 40) {
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

  const weightedSum = puntuables.reduce(
    (sum, ap) => sum + (activityScore(ap) ?? 0) * getActivityWeight(ap),
    0,
  )

  const totalWeight =
    denominator ??
    puntuables.reduce((sum, ap) => sum + getActivityWeight(ap), 0)

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
type ActividadDelPlan = {
  id: string
  type?: string
  weight?: number | null
  verification?: { is_evaluative?: boolean; max_attempts?: number }
}

/** Registro de progreso tal como sale de Prisma. */
type ProgresoGuardado = {
  activityId: string
  attempts: number
  tangentCount?: number | null
  evidenceData: unknown
  passedCriteria?: boolean | null
}

/**
 * La nota de una sesión. ÚNICO punto donde se calcula.
 *
 * Había tres: chat/stream (sin pesos ni denominador), voice/message (igual) y
 * eval/finish (con ambos). O sea, tres notas distintas para el mismo alumno
 * según por dónde entrara. Los pesos por tipo de actividad —exposición 1,
 * cierre 4— existían en la fórmula pero solo llegaban desde el kiosko: en los
 * cursos generales todo pesaba 1 y nadie lo notó.
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

  const enriquecidas: ScorableActivity[] = evaluativas.map((p) => {
    const a = meta.get(p.activityId)
    return {
      attempts: p.attempts,
      tangentCount: p.tangentCount,
      evidenceData: p.evidenceData,
      passedCriteria: p.passedCriteria,
      activityType: a?.type as ScorableActivity['activityType'],
      weight: a?.weight,
      maxAttempts: a?.verification?.max_attempts,
    }
  })

  // Denominador = pesos ESPERADOS de todas las evaluativas de la lección, no
  // solo de las completadas: dejar tres actividades sin hacer debe pesar.
  const denominador = actividadesDelPlan
    .filter((a) => a.verification?.is_evaluative !== false)
    .reduce(
      (sum, a) =>
        sum +
        getActivityWeight({
          attempts: 0,
          evidenceData: null,
          activityType: a.type as ScorableActivity['activityType'],
          weight: a.weight,
        }),
      0
    )

  return calculateGrade(enriquecidas, denominador)
}
