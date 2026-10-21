/**
 * Quita la calificación con que Sophia abre un mensaje («Exacto.», «Bien
 * pensado.», «Correcto,») en los pasos que no llevan nota (rutina Veo ·
 * Pienso · Me pregunto, cierre). El prompt se lo prohíbe desde el 19 oct
 * 2026 y la auditoría R1 lo detecta, pero el modelo lo sigue haciendo (21 oct:
 * «Exacto. Mencionas el vacío…» al empezar una prueba desde «Me pregunto»).
 * Como con el voseo (lib/voseo.ts), el código lo corrige antes de mostrarlo y
 * guardarlo. Solo al inicio del mensaje: en medio no se toca.
 */
const CALIFICACION_INICIAL =
  /^\s*(?:¡)?(?:exacto|exactamente|correcto|perfecto|excelente|genial|muy bien|bien pensado|bien observado|bien visto|buena observación|buen punto|así es|eso es|bien)(?:[.!,:;]+|\s*[—-]\s*)\s*/iu

export function quitarCalificacionInicial(texto: string): string {
  const sin = texto.replace(CALIFICACION_INICIAL, '')
  if (sin === texto || !sin.trim()) return texto
  // La frase que sigue empieza con mayúscula, como empezaría el mensaje.
  const i = sin.search(/\S/)
  return sin.slice(0, i) + sin[i].toUpperCase() + sin.slice(i + 1)
}

/**
 * Para streaming: retiene el comienzo hasta tener la primera oración (o unos
 * 60 caracteres), decide ahí y después deja pasar todo tal cual.
 */
export function crearQuitadorDeCalificacionInicial() {
  let pendiente = ''
  let decidido = false
  return {
    push(trozo: string): string {
      if (decidido) return trozo
      pendiente += trozo
      if (!/[.!?:;,\n]/.test(pendiente) && pendiente.length < 60) return ''
      decidido = true
      const listo = quitarCalificacionInicial(pendiente)
      pendiente = ''
      return listo
    },
    flush(): string {
      const resto = decidido ? pendiente : quitarCalificacionInicial(pendiente)
      pendiente = ''
      decidido = true
      return resto
    },
  }
}
