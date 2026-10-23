/**
 * Quita las calificaciones de Sophia («Exacto.», «Bien pensado.», «Correcto,»)
 * en los pasos que no llevan nota (rutina Veo · Pienso · Me pregunto, cierre).
 * El prompt se lo prohíbe desde el 19 oct 2026 y la auditoría R1 lo detecta,
 * pero el modelo lo sigue haciendo. Como con el voseo (lib/voseo.ts), el código
 * lo corrige antes de mostrarlo y guardarlo.
 *
 * Al comienzo de CADA oración, no solo del mensaje (21 oct 2026): en las
 * simulaciones aparecía al final («…está cercado. Bien observado.») y a mitad
 * («Bien, eso es lo que ves.»). Una oración que era solo la calificación se va
 * entera; si había algo después, queda eso, con mayúscula.
 * 22 oct 2026 (ocho sesiones nuevas): «Eso es una buena observación:» y «Exacto lo que
 * muestra la figura.» también.
 */
const CALIFICACION =
  '¡?(?:eso es (?:una |un )?(?:buena observación|buen punto)|exacto lo que[^.!?\n]*|(?:excelente|buena|muy buena) pregunta|exacto|exactamente|correcto|perfecto|excelente|genial|muy bien|bien pensado|bien observado|bien visto|buena observación|buen punto|así es|eso es|bien)(?:[.!,:;]+|\\s*[—-]\\s*)'

const EN_CADA_ORACION = new RegExp(`(^[ \\t]*|[.!?…]\\s+|\\n\\s*)${CALIFICACION}[ \\t]*`, 'giu')
const MARCA = '\u0000'

/**
 * La calificación con que abre cada oración. `permitirVacio` en falso (por
 * defecto): si el texto quedaría vacío, se deja como estaba (un mensaje que es
 * solo «Exacto.» no se borra).
 */
export function quitarCalificaciones(texto: string, permitirVacio = false): string {
  let s = texto.replace(EN_CADA_ORACION, (_m, antes: string) => antes + MARCA)
  if (s === texto) return texto
  s = s
    .replace(new RegExp(`[ \\t]*${MARCA}[ \\t]*$`), '')                                   // oración quitada al final
    .replace(new RegExp(`[ \\t]*${MARCA}[ \\t]*(?=\\n)`, 'g'), '')                         // o antes de un salto de línea
    .replace(new RegExp(`${MARCA}([ \\t]*)(\\S)`, 'g'), (_m, _e, c: string) => c.toUpperCase()) // lo que sigue, con mayúscula
    .replace(new RegExp(MARCA, 'g'), '')
  if (!s.trim() && !permitirVacio) return texto
  return s
}

/** Solo la calificación con que abre el mensaje (se mantiene para quien la use). */
export function quitarCalificacionInicial(texto: string): string {
  const sin = texto.replace(new RegExp(`^\\s*${CALIFICACION}\\s*`, 'iu'), '')
  if (sin === texto || !sin.trim()) return texto
  const i = sin.search(/\S/)
  return sin.slice(0, i) + sin[i].toUpperCase() + sin.slice(i + 1)
}

/**
 * Para streaming: deja pasar el texto por oraciones completas (hasta la última
 * puntuación seguida de espacio) y quita la calificación de cada una. Retiene
 * lo que falta de la oración en curso. Solo el comienzo del mensaje cuida de no
 * dejarlo vacío; una oración de en medio que era solo «Bien observado.» se quita.
 */
export function crearQuitadorDeCalificaciones() {
  let pendiente = ''
  let primero = true
  const procesar = (seg: string, final: boolean) => {
    // Al comienzo, si TODO el mensaje es la calificación, se deja (permitirVacio solo
    // cuando ya salió texto antes o cuando todavía viene más).
    const listo = quitarCalificaciones(seg, !primero || !final)
    primero = false
    return listo
  }
  return {
    push(trozo: string): string {
      pendiente += trozo
      let corte = -1
      // Se corta justo después de la puntuación: el espacio viaja con la oración
      // siguiente, así una oración quitada no deja un espacio colgando.
      for (const m of pendiente.matchAll(/[.!?…\n](?=\s+\S)/g)) corte = (m.index ?? 0) + 1
      if (corte <= 0) return ''
      const seg = pendiente.slice(0, corte)
      pendiente = pendiente.slice(corte)
      return procesar(seg, false)
    },
    flush(): string {
      const resto = pendiente ? procesar(pendiente, true) : ''
      pendiente = ''
      return resto
    },
  }
}
