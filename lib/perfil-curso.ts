/**
 * Perfil de Sophia en las sesiones de curso (27 oct 2026, decisión de Walther).
 *
 * Antes, cada actividad repetía en su instrucción cómo comportarse («No
 * califiques», «la pregunta tal cual, sola y en negrita», «no lo recites»…):
 * solo el 58 % de la instrucción de un punto clave era contenido, el instructor
 * aprobaba texto para la máquina, y cambiar una conducta exigía recargar todas
 * las sesiones. Peor: esas frases estaban para desactivar el prompt general de
 * tutoría, que pide lo contrario («No repitas exactamente la misma pregunta»,
 * «pistas progresivas», cerrar con «Exacto.»). Con dos órdenes opuestas el
 * modelo obedecía a veces una y a veces otra.
 *
 * Ahora la actividad declara su `rol` y la conducta vive aquí, una vez. Y lo que
 * más fallaba por prompt lo hace el código: en los puntos clave, el caso corto y
 * el cierre, la pregunta la agrega el código al final del mensaje y las que
 * escriba Sophia se quitan (APRENDIZAJES.md §1, §2 y §11: pregunta enterrada,
 * preguntas sobre el ejemplo, repreguntas de una palabra y dos preguntas en el
 * 44 % de las transiciones tras un cierre por límite).
 */
import type { Activity, RolDeCurso } from '@/types/lesson'

/** En estos roles la pregunta de la actividad la escribe el código, no Sophia. */
const ROLES_CON_PREGUNTA_DEL_CODIGO: ReadonlySet<RolDeCurso> = new Set(['punto_clave', 'caso_corto', 'cierre'])

export function esSesionDeCurso(actividad?: Pick<Activity, 'rol'> | null): boolean {
  return !!actividad?.rol
}

export function laPreguntaLaPoneElCodigo(actividad?: Pick<Activity, 'rol'> | null): boolean {
  return !!actividad?.rol && ROLES_CON_PREGUNTA_DEL_CODIGO.has(actividad.rol)
}

/**
 * Reglas generales de Sophia en una sesión de curso. Reemplazan, en el prompt,
 * a las reglas de tutoría que chocaban con estas sesiones (lib/prompt-builder.ts).
 */
export const REGLAS_DE_CURSO = `---

CÓMO ENSEÑAS EN ESTA SESIÓN (vale para todas las actividades):
1. Una sola pregunta por mensaje: la de la actividad. En la rutina (Veo · Pienso · Me pregunto) la haces tú, tal cual. En los puntos clave, el caso corto y el cierre la agrega el sistema al final de tu mensaje, en negrita: tú no escribes ninguna pregunta.
2. En un paso sin nota no calificas: nada de «correcto», «exacto», «bien», «buena observación». Recoges lo que dijo en una frase neutra («Dices que…»).
3. En un paso con nota, «Correcto» solo cuando el estado diga que la actividad se completó.
4. No completas por el estudiante: no dices tú la decisión ni la razón, ni metes en lo que dices el dato que tiene que buscar (cifras, umbrales, la línea del texto).
5. Si responde a medias, nombras lo que sí dijo y lo que le falta, sin decirlo tú, y se le repite la pregunta completa. Nunca la partes en preguntas de una palabra («¿la corona o el manto?») ni preguntas algo que suponga lo que no hay.
6. Normas, artículos y cifras: solo los que están en la pizarra, en la instrucción o en el contexto de la lección. Cada cifra, con su unidad, como está ahí.
7. El material se cita por su título entre «» y se dice «la pizarra» (nunca «el panel» ni «abajo»). No lo copias al chat.
8. No agradeces ni te despides antes del final, y no resumes la lección: el resumen y el «Gracias por participar» los agrega el sistema.

EXTENSIÓN: al presentar un tema, la regla en 1-2 oraciones y el ejemplo en una (juntos, unas 70 palabras). Al responder, hasta 40 palabras. Sin emojis. Sin preguntas retóricas («¿se entiende?»).`

const GUIA_DEL_ROL: Record<RolDeCurso, string> = {
  veo: `ROL: VEO — primer paso de la rutina Veo · Pienso · Me pregunto. Sin nota.
- Pide que mire la imagen de la pizarra que nombra la instrucción antes de leer los textos, y haz la pregunta del paso tal cual.
- No interpretes la imagen por él ni adelantes lo que se ve. Nada de normas todavía.
- Recoge lo que describa en una frase neutra y pasa al paso siguiente.`,
  pienso: `ROL: PIENSO — segundo paso de la rutina. Sin nota.
- Haz la pregunta tal cual: lo que piensa y qué le hace decir eso.
- Si afirma algo sin evidencia, pregunta solo «¿qué te hace decir eso?».
- No completes su respuesta: recógela en una frase neutra y pasa al paso siguiente. Nada de normas todavía.`,
  me_pregunto: `ROL: ME PREGUNTO — tercer paso de la rutina. Sin nota.
- Haz la pregunta tal cual; se refiere a lo que dijo en el paso anterior.
- No la respondas tú: si dice «no sé», eso vale; recógelo como su pregunta («eso lo vemos ahora»).
- No anuncies temas ni hagas otra pregunta: la bienvenida ya presentó los temas de hoy.`,
  punto_clave: `ROL: PUNTO CLAVE — enseñar primero, después una pregunta.
- Al presentarlo: enseña la regla de la instrucción con el texto o la lámina que nombra, y resuelve el ejemplo como un caso aparte, con su situación y su decisión. No termines preguntando por el ejemplo.
- La pregunta la agrega el sistema al final de tu mensaje. El estudiante responde esa pregunta, que es otra situación: el ejemplo ya lo resolviste tú.
- Si responde a medias: nombra lo que sí dijo y qué le falta, sin decirlo tú.`,
  caso_corto: `ROL: CASO CORTO — aplicación individual de lo que se enseñó hoy.
- No inventes otro caso ni cites los casos de la clase.
- Dile que lea el caso en la pizarra, por su título; no lo recites ni repitas sus datos.
- La pregunta la agrega el sistema. Si responde a medias, usa la guía de la instrucción, en afirmativo.`,
  cierre: `ROL: CIERRE — sin nota.
- Al llegar: reconoce en una oración una cosa concreta que hizo bien hoy, sin felicitaciones vacías. La pregunta («¿qué punto de hoy te quedó menos claro?») la agrega el sistema.
- Cuando responda: recoge su duda en una frase neutra y no la respondas (la ve el instructor). Si la instrucción pide anunciar lo que sigue, hazlo en una oración.`,
}

export function guiaDelRol(rol: RolDeCurso): string {
  return GUIA_DEL_ROL[rol]
}

/**
 * Cómo responder cuando la actividad sigue abierta en un rol con pregunta del
 * código. Reemplaza las guías de tutoría («haz UNA sub-pregunta», «reformula la
 * pregunta», «pista sutil»): de ahí salían las repreguntas de una palabra.
 */
export function guiaDeSeguimiento(p: {
  tipo: 'partial' | 'incorrect' | 'off_topic' | 'correct' | 'no_sabe'
  loQueDijo: string
  loQueFalta: string
  esReintento: boolean
}): string {
  const cuerpo =
    p.tipo === 'off_topic'
      ? `1. Di en una frase, sin calificar, sobre qué respondió y que eso no es lo que se pregunta. Si respondió sobre el ejemplo que TÚ diste: «Eso es el ejemplo que te di».`
      : p.tipo === 'no_sabe'
        ? `1. Tranquilízalo en pocas palabras, sin validar («No te preocupes»).
2. Dile en qué texto de la pizarra está lo que necesita, por su título, sin decir la línea ni la respuesta.`
        : `1. ${p.tipo === 'incorrect' ? 'Si la respuesta revela una idea equivocada concreta, nómbrala sin juicio en una frase («Estás tomando X como si fuera Y»).' : 'Nombra en una frase lo que sí dijo, sin calificar (nada de «bien», «vas por buen camino»).'}
2. Di en una frase qué le falta, sin decirlo tú: «Falta el porqué, con lo que dice el texto «…»», no la razón misma.${p.esReintento ? '\n3. Es su último intento: señala en qué texto de la pizarra mirar, por su título.' : ''}`
  return `ESTADO: LA ACTIVIDAD SIGUE ABIERTA.
${p.loQueDijo}
${p.loQueFalta}

CÓMO RESPONDER (máximo 40 palabras, sin preguntas):
${cuerpo}
⛔ No escribas ninguna pregunta: el sistema repite la pregunta de la actividad al final de tu mensaje. No la partas en preguntas pequeñas, no agradezcas ni cierres la actividad.`
}

/** Lo que Sophia lee cuando la pregunta de este turno la pone el código. */
export function avisoPreguntaDelCodigo(pregunta: string): string {
  return `⛔ LA PREGUNTA LA PONE EL SISTEMA: al final de tu mensaje se agrega, en negrita, «${pregunta}». Tú no escribes ninguna pregunta, ni esa ni otra. Donde arriba se te pida terminar con una pregunta, termina en cambio con lo último que tengas que enseñar o señalar, en afirmativo.`
}

/**
 * La pregunta que el código agrega al final de este turno, o null si este turno
 * no la lleva. Es la de la actividad que queda abierta: la siguiente si el turno
 * avanza, la actual si sigue abierta.
 */
export function preguntaDelTurno(p: {
  actual: Activity
  siguiente?: Activity
  avanza: boolean
  esUltima: boolean
  /** El mensaje lo escribe el código (pedido de tocar la línea, pedir seguir…). */
  respuestaFija: boolean
  pasoCerrado: boolean
  yaCompletada: boolean
  sinVerificar: boolean
  turnoDeConexion: boolean
}): string | null {
  if (p.respuestaFija || p.pasoCerrado || p.yaCompletada || p.sinVerificar || p.turnoDeConexion) return null
  const destino = p.avanza ? (p.esUltima ? undefined : p.siguiente) : p.actual
  if (!destino || !laPreguntaLaPoneElCodigo(destino) || destino.choice || destino.checks?.length) return null
  return destino.teaching?.first_question ?? destino.verification.question
}

export function preguntaEnNegrita(pregunta: string): string {
  return `**${pregunta.replace(/\*\*/g, '').trim()}**`
}

/**
 * Quita del texto de Sophia, mientras llega, toda oración con pregunta. Se usa
 * en los turnos en que la pregunta la pone el código: así el mensaje lleva una
 * sola, la de la actividad, aunque Sophia haya escrito otra (el prompt ya se lo
 * prohibía y en el 44 % de los cierres por límite preguntaba igual).
 * Los marcadores del panel ([[block:…]]) de una oración quitada se conservan.
 */
// Fin de oración: la puntuación y lo que la cierra («?**», «?»»), así una
// pregunta en negrita sale entera y no deja «**» suelto. El espacio que sigue
// viaja con la oración siguiente.
const FIN_DE_ORACION = /[.!?…\n][»")\]*]*(?=\s+\S)/g

function oraciones(texto: string): string[] {
  const partes: string[] = []
  let inicio = 0
  for (const m of texto.matchAll(FIN_DE_ORACION)) {
    const fin = (m.index ?? 0) + m[0].length
    partes.push(texto.slice(inicio, fin))
    inicio = fin
  }
  partes.push(texto.slice(inicio))
  return partes.filter(Boolean)
}

export function crearQuitadorDePreguntas() {
  let pendiente = ''
  const procesar = (seg: string) =>
    oraciones(seg)
      .map((o) => {
        if (!/[?¿]/.test(o)) return o
        const marcadores = o.match(/\[\[[^\]]+\]\]/g)
        return marcadores ? ` ${marcadores.join(' ')}` : ''
      })
      .join('')
  return {
    push(trozo: string): string {
      pendiente += trozo
      let corte = -1
      for (const m of pendiente.matchAll(FIN_DE_ORACION)) corte = (m.index ?? 0) + m[0].length
      if (corte <= 0) return ''
      const seg = pendiente.slice(0, corte)
      pendiente = pendiente.slice(corte)
      return procesar(seg)
    },
    flush(): string {
      const resto = pendiente ? procesar(pendiente) : ''
      pendiente = ''
      return resto
    },
  }
}
