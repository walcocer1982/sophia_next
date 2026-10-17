/**
 * Regla de diseño: una actividad = un pedido (13 oct 2026).
 *
 * El alumno tiene que poder responder la pregunta de una actividad en un solo
 * mensaje corto, sobre una sola cosa: una decisión con su porqué, una
 * predicción, un diagnóstico. Cuando la pregunta trae dos tareas («¿qué
 * criterio subirías? Y reescribe esta oración…»), el desglose se gasta en la
 * primera, el tope de sub-preguntas avanza la actividad y la segunda se pierde
 * o Sophia la pide a destiempo, junto con la actividad siguiente (prueba de
 * EVA-NOTA, actividad 7).
 *
 * El detector es conservador a propósito: solo marca señales claras. Avisa,
 * no bloquea; quien diseña decide.
 */

/** Verbos que piden producir algo (no solo responder). */
const PRODUCCION = /\b(reescribe|redacta|escribe|calcula|dibuja|elabora|completa|resuelve|arma|diseña)\b/i
/** Un segundo pedido encadenado: «Y dime…», «Y explica…», «Además…». */
const ENCADENA = /\b(y|además|también)\s+(dime|explica|cuéntame|indica|menciona|describe|reescribe|redacta|escribe|calcula|propón|justifica)\b/i

function quitarCitas(texto: string): string {
  // Lo citado entre comillas es material, no un pedido («…falló porque…»).
  return texto.replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, '«»')
}

/** El porqué de lo que se acaba de preguntar: es parte del mismo pedido. */
const ES_PORQUE = /^\s*(¿\s*)?(y\s+)?(por\s*qu[eé]|expl[ií]ca(me)?\s+(por\s*qu[eé]|tu\s+raz[oó]n)|justifica|fundamenta|con\s+qu[eé]\s+dato)/i
/** Lo que sigue a la pregunta sin pedir nada nuevo: ejemplos o qué hacer si no sabe. */
const ACLARA = /^\s*(por\s+ejemplo|ej\.|p\.\s*ej\.|si\s+no\s+(sabes|recuerdas|tienes)|si\s+es\s+tu\s+primer)/i

/**
 * Si la pregunta pide más de una cosa, devuelve por qué (para mostrarlo en el
 * editor); si no, null.
 *
 * Permitido: la decisión con su porqué («¿Podría? ¿Por qué no?», «¿…?
 * Explícame por qué»), ejemplos o un «si no sabes…» después de la pregunta, y
 * una tarea que termina en la pregunta que la detalla («Diseña tu plan: ¿qué
 * harás cada día?»).
 */
export function revisarPedidos(pregunta: string | undefined | null): string | null {
  if (!pregunta?.trim()) return null
  const t = quitarCitas(pregunta.trim())

  // Preguntas: cada «¿…?». Las que solo piden el porqué de la anterior no cuentan.
  const preguntas = t.match(/¿[^?]*\?/g) ?? []
  const distintas = preguntas.filter((p, i) => i === 0 || !ES_PORQUE.test(p))
  if (distintas.length >= 2) return 'Tiene dos preguntas: el alumno responderá una y la otra quedará para el desglose.'

  // Texto con contenido después del último «?»: otro pedido detrás de la pregunta.
  const ultimo = t.lastIndexOf('?')
  if (ultimo >= 0) {
    const resto = t.slice(ultimo + 1)
    const palabras = resto.replace(/[«»\s.:,;!]/g, ' ').trim().split(/\s+/).filter(Boolean)
    if (palabras.length >= 3 && !ES_PORQUE.test(resto) && !ACLARA.test(resto)) {
      return 'Después de la pregunta pide otra cosa: sepáralo en dos actividades.'
    }
  }

  if (ENCADENA.test(t)) return 'Encadena un segundo pedido («y dime…», «y explica…»): sepáralo en dos actividades.'

  // Producir algo en una oración y preguntar otra cosa en otra. Si la pregunta
  // viene tras «:» en la misma oración, es el detalle de la misma tarea.
  const oraciones = t.split(/(?<=[.!?])\s+/)
  const conProduccion = oraciones.findIndex((o) => PRODUCCION.test(o) && !o.includes('¿'))
  const conPregunta = oraciones.findIndex((o, i) => i !== conProduccion && o.includes('¿') && !ES_PORQUE.test(o))
  if (conProduccion >= 0 && conPregunta >= 0) {
    return 'Pide producir algo (reescribir, calcular…) y además responder otra pregunta: son dos tareas, sepáralas.'
  }

  return null
}

export interface AvisoDePedidos {
  activityId: string
  campo: 'verification.question' | 'teaching.first_question' | 'choice.prompt'
  texto: string
  motivo: string
}

type ActividadMinima = {
  id: string
  verification?: { question?: string }
  teaching?: { first_question?: string }
  choice?: { prompt?: string }
}

/** Revisa las preguntas de todas las actividades de una lección. */
export function avisosDePedidos(actividades: ActividadMinima[]): AvisoDePedidos[] {
  const avisos: AvisoDePedidos[] = []
  for (const a of actividades) {
    const campos: [AvisoDePedidos['campo'], string | undefined][] = [
      ['verification.question', a.verification?.question],
      ['teaching.first_question', a.teaching?.first_question],
      ['choice.prompt', a.choice?.prompt],
    ]
    for (const [campo, texto] of campos) {
      const motivo = revisarPedidos(texto)
      if (motivo && texto) avisos.push({ activityId: a.id, campo, texto, motivo })
    }
  }
  return avisos
}
