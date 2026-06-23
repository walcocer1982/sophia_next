/**
 * Generador de rúbrica por actividad.
 *
 * Crea —UNA sola vez, al publicar la lección— las 4 respuestas-referencia
 * (una por nivel de logro) y las pistas de andamiaje por criterio, a partir de
 * la pregunta + criterios + instrucción de enseñanza. NO participa el instructor.
 *
 * El verificador luego COMPARA la respuesta del alumno contra estas anclas
 * (prompt corto) en vez de arrastrar el manual genérico de ~2000 tokens.
 *
 * Modelo: DEFAULT_MODEL (Sonnet) — es una generación de calidad, no de latencia,
 * y corre fuera del camino de respuesta (al publicar, no por mensaje).
 */

import { anthropic, DEFAULT_MODEL, extractJsonFromMarkdown } from '@/lib/anthropic'
import type { Activity, Rubric, ScaffoldHint } from '@/types/lesson'

export interface GeneratedRubric {
  rubric: Rubric
  scaffold_hints: ScaffoldHint[]
}

function buildGeneratorPrompt(activity: Activity): string {
  const question = activity.verification.question
  const criteria = activity.verification.success_criteria?.must_include || []
  const agentInstruction =
    activity.teaching?.agent_instruction ||
    (activity as { agent_instruction?: string }).agent_instruction ||
    ''

  return `Eres diseñador pedagógico. Para esta actividad vas a generar EJEMPLOS de cómo respondería un estudiante en 4 niveles de logro, y pistas de andamiaje por criterio.

PREGUNTA DE VERIFICACIÓN:
${question}

LO QUE SE ENSEÑA EN LA ACTIVIDAD:
${agentInstruction}

CRITERIOS DE ÉXITO (must_include):
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

GENERA DOS COSAS:

1) "rubric": una respuesta-EJEMPLO típica de un estudiante en CADA nivel, en la
   VOZ DEL ESTUDIANTE (no del profesor), de 1-2 oraciones, natural y concreta:
   - "beginning"   (INICIO):    no sabe, responde sin relación, o con error conceptual grave.
   - "developing"  (PROCESO):   intento parcial; cubre ~1 criterio de forma incompleta o confusa.
   - "achieved"    (LOGRADO):   cubre 2 o más criterios con claridad, sin justificar el porqué.
   - "outstanding" (DESTACADO): cubre los criterios Y los justifica con una relación causa-efecto o argumento.

   Son ANCLAS de calibración, NO la única respuesta válida. Hazlas realistas
   (como hablaría un alumno), no perfectas ni de manual.

2) "scaffold_hints": por CADA criterio (por su índice 0-based), una pista CORTA
   (1 oración) que induzca al estudiante hacia ese criterio SIN revelar la
   respuesta ni el nombre del concepto. Nunca listes opciones ("¿es A o B?").

Responde SOLO con este JSON, sin texto adicional:
{
  "rubric": {
    "beginning": "...",
    "developing": "...",
    "achieved": "...",
    "outstanding": "..."
  },
  "scaffold_hints": [
    { "criterion": 0, "hint": "..." }
  ]
}`
}

/**
 * Genera la rúbrica (referencias + pistas) para una actividad.
 * Lanza si el modelo devuelve algo inválido — el caller decide el fallback.
 */
export async function generateActivityRubric(activity: Activity): Promise<GeneratedRubric> {
  const prompt = buildGeneratorPrompt(activity)

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Generador de rúbrica: respuesta no textual')
  }

  const parsed = JSON.parse(extractJsonFromMarkdown(content.text)) as GeneratedRubric

  // Validación mínima de forma
  const levels: (keyof Rubric)[] = ['beginning', 'developing', 'achieved', 'outstanding']
  for (const lvl of levels) {
    if (typeof parsed.rubric?.[lvl] !== 'string' || !parsed.rubric[lvl].trim()) {
      throw new Error(`Generador de rúbrica: falta nivel "${lvl}"`)
    }
  }
  if (!Array.isArray(parsed.scaffold_hints)) {
    parsed.scaffold_hints = []
  }

  return { rubric: parsed.rubric, scaffold_hints: parsed.scaffold_hints }
}
