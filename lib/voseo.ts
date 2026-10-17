/**
 * Corrector de voseo (14 oct 2026). El prompt prohíbe el voseo, pero se le
 * escapa al modelo en ~5 % de los mensajes («Mirá el caso de Luis»). Los
 * alumnos son de Perú: el código lo corrige antes de mostrarlo y guardarlo.
 * Solo formas inequívocas de voseo (con su tilde o su pronombre), para no
 * tocar palabras normales: «mirá» se corrige, «mira» no.
 */
const FORMAS: [string, string][] = [
  ['mirá', 'mira'], ['fijate', 'fíjate'], ['fijáte', 'fíjate'], ['pensá', 'piensa'], ['imaginá', 'imagina'],
  ['contame', 'cuéntame'], ['contáme', 'cuéntame'], ['decime', 'dime'], ['decíme', 'dime'], ['explicame', 'explícame'],
  ['probá', 'prueba'], ['elegí', 'elige'], ['escribí', 'escribe'], ['leé', 'lee'], ['mové', 'mueve'], ['bajá', 'baja'],
  ['subí', 'sube'], ['cargá', 'carga'], ['respondé', 'responde'], ['revisá', 'revisa'], ['acordate', 'acuérdate'],
  ['tenés', 'tienes'], ['podés', 'puedes'], ['querés', 'quieres'], ['sabés', 'sabes'], ['sos', 'eres'],
  ['creés', 'crees'], ['decís', 'dices'], ['ves', 'ves'], ['tenías', 'tenías'], ['necesitás', 'necesitas'],
  ['entendés', 'entiendes'], ['pensás', 'piensas'], ['hacés', 'haces'], ['estás', 'estás'],
]
// «estás», «ves» y «tenías» son iguales en tuteo: se dejan para no confundirlos.
const MAPA = new Map(FORMAS.filter(([a, b]) => a !== b))
const PATRON = new RegExp(`(^|[^\\p{L}])(${[...MAPA.keys()].join('|')})(?=$|[^\\p{L}])`, 'giu')

function conMayuscula(original: string, reemplazo: string): string {
  return original[0] === original[0].toUpperCase() ? reemplazo[0].toUpperCase() + reemplazo.slice(1) : reemplazo
}

export function corregirVoseo(texto: string): string {
  return texto
    .replace(PATRON, (_m, antes: string, palabra: string) => antes + conMayuscula(palabra, MAPA.get(palabra.toLowerCase()) ?? palabra))
    .replace(/(^|[^\p{L}])(vos)(?=[^\p{L}]|$)/giu, (_m, antes: string, p: string) => antes + conMayuscula(p, 'tú'))
}

/**
 * Para streaming: retiene la última palabra (puede llegar partida entre
 * trozos: «Mir» + «á») hasta saber cómo termina.
 */
export function crearCorrectorDeVoseo() {
  let pendiente = ''
  return {
    push(trozo: string): string {
      pendiente += trozo
      const corte = Math.max(pendiente.lastIndexOf(' '), pendiente.lastIndexOf('\n'))
      if (corte < 0) return ''
      const listo = pendiente.slice(0, corte + 1)
      pendiente = pendiente.slice(corte + 1)
      return corregirVoseo(listo)
    },
    flush(): string {
      const resto = corregirVoseo(pendiente)
      pendiente = ''
      return resto
    },
  }
}
