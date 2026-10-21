/**
 * ¿El alumno pide que le aclaren la PREGUNTA, en vez de responderla?
 *
 * Prueba de Edwin (21 oct 2026, SI-ALTORIESGO S1): en un paso sin nota de un
 * solo turno, «¿Puedes profundizar la pregunta, a qué te refieres con cada uno?»
 * se aceptó como respuesta y el paso avanzó. Sophia aclaró la pregunta vieja y
 * planteó la nueva en el mismo mensaje, se saltó la enseñanza de la actividad
 * siguiente, y la respuesta a la pregunta vieja se evaluó contra la nueva.
 *
 * Solo frases sobre la pregunta misma («a qué te refieres», «no entiendo la
 * pregunta»), no dudas de contenido («¿qué es distinto nivel?»): esas se
 * responden dentro de la actividad. Independiente del tema.
 */
const PIDE_ACLARACION = new RegExp(
  [
    'a\\s+qu[eé]\\s+te\\s+refieres',
    'a\\s+qu[eé]\\s+se\\s+refiere',
    'qu[eé]\\s+quieres\\s+decir',
    'no\\s+entiendo\\s+(?:bien\\s+)?(?:la|tu)\\s+pregunta',
    'no\\s+entend[ií]\\s+(?:bien\\s+)?(?:la|tu)\\s+pregunta',
    'qu[eé]\\s+(?:me\\s+)?(?:pides|preguntas)',
    '(?:puedes|puede|podr[ií]as|podr[ií]a|me\\s+puedes|me\\s+puede)\\s+(?:\\w+\\s+){0,3}(?:explicar|aclarar|profundizar|repetir|reformular)(?:\\s+(?:\\w+\\s+){0,3})?(?:la\\s+)?pregunta',
    // Tú y usted: en Perú muchos alumnos tratan de usted a Sophia («acláreme»).
    '(?:expl[ií]came|acl[aá]rame|rep[ií]teme|expl[ií]queme|acl[aá]reme|rep[ií]tame)',
    // «me explica» no: aparece en respuestas («como usted me explica, sí es…»).
    'me\\s+(?:aclara|aclare)\\b',
    'no\\s+me\\s+queda\\s+claro\\s+(?:a\\s+qu[eé]|qu[eé]\\s+(?:me\\s+)?(?:pide|pides|pregunta))',
  ].join('|'),
  'i',
)

/**
 * Un mensaje largo trae una respuesta aunque mencione la pregunta: ese se
 * evalúa. Hasta 45 palabras basta la frase; hasta 90, además tiene que
 * preguntar algo («?»). La simulación del 21 oct pidió aclarar en 70 palabras,
 * con ejemplos, y el corte en 45 la dejaba pasar como respuesta.
 */
const MAX_PALABRAS = 45
const MAX_PALABRAS_CON_PREGUNTA = 90

export function pideAclaracion(mensaje: string): boolean {
  const t = mensaje.normalize('NFC')
  const palabras = t.trim().split(/\s+/).length
  if (palabras > MAX_PALABRAS_CON_PREGUNTA) return false
  if (palabras > MAX_PALABRAS && !t.includes('?')) return false
  return PIDE_ACLARACION.test(t)
}

/** La guía para Sophia: reformular la misma pregunta, sin responderla ni avanzar. */
export function guiaAclaracion(pregunta: string): string {
  return `ESTADO: PIDE ACLARAR LA PREGUNTA — el estudiante no respondió: pidió que le expliques la pregunta. Este turno NO se evalúa ni avanza.
CÓMO RESPONDER (máximo 45 palabras, dos oraciones):
1. Empieza con "Me refiero a" y di en esa oración, con otras palabras, qué le estás preguntando. Si la pregunta se refiere a algo que él dijo antes («cada uno», «eso»), nómbralo con sus palabras.
2. Vuelve a hacer la pregunta: "${pregunta}"
⛔ PROHIBIDO responderla tú, dar un ejemplo de respuesta, calificar, pasar a otro tema o actividad, o hacer otra pregunta además de la repetida.`
}
