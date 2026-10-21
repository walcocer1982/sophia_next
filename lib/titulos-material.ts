/**
 * Títulos del material entre «» (prueba de Edwin, 21 oct 2026). Sophia escribe
 * «Mira la fotografía Obra en losa en la pizarra»: el título suelto dentro de la
 * oración se lee como una frase rota. El prompt ya lo pone entre «», pero el
 * modelo a veces lo copia sin ellas; como el voseo (lib/voseo.ts), se corrige
 * en el código antes de mostrarlo y guardarlo.
 *
 * Solo cuando el título viene justo después de nombrar el material («la
 * fotografía X», «el texto X»): así «la caída de objetos alcanza…» no se toca
 * aunque exista un bloque llamado «Caída de objetos». Independiente del tema.
 */
const NOMBRE_DE_MATERIAL = '(?:fotograf[ií]a|foto|imagen|l[aá]mina|texto|tabla|esquema|diagrama|caso|ficha|norma)'

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patron(titulos: string[]): RegExp | null {
  const validos = [...new Set(titulos.map((t) => t.trim()).filter((t) => t.split(/\s+/).length >= 2))]
    .sort((a, b) => b.length - a.length)
  if (!validos.length) return null
  // El título no debe venir ya entre comillas: se exige que no siga a «, " o “.
  return new RegExp(`(${NOMBRE_DE_MATERIAL}\\s+)(?![«"“'*])(${validos.map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
}

export function comillasEnTitulos(texto: string, titulos: string[]): string {
  const re = patron(titulos)
  if (!re) return texto
  return texto.replace(re, (_, nombre: string, titulo: string) => {
    // Respeta el título tal como está en la lección (mayúsculas incluidas).
    const original = titulos.find((t) => t.trim().toLowerCase() === titulo.toLowerCase())?.trim() ?? titulo
    return `${nombre}«${original}»`
  })
}

/**
 * Para streaming: retiene el final del texto lo suficiente para no cortar un
 * título a la mitad (el nombre del material más el título más largo).
 */
export function crearCorrectorDeTitulos(titulos: string[]) {
  const re = patron(titulos)
  const reserva = Math.max(0, ...titulos.map((t) => t.length)) + 16
  let pendiente = ''
  return {
    push(trozo: string): string {
      if (!re) return trozo
      pendiente = comillasEnTitulos(pendiente + trozo, titulos)
      if (pendiente.length <= reserva) return ''
      let corte = pendiente.lastIndexOf(' ', pendiente.length - reserva)
      if (corte <= 0) return ''
      // Si un nombre de material queda justo antes del corte, se corta antes de él.
      const antes = pendiente.slice(Math.max(0, corte - 14), corte + 1)
      const m = antes.match(new RegExp(`${NOMBRE_DE_MATERIAL}\\s*$`, 'iu'))
      if (m) corte = Math.max(0, corte - (antes.length - (m.index ?? 0)) + 1)
      if (corte <= 0) return ''
      const listo = pendiente.slice(0, corte)
      pendiente = pendiente.slice(corte)
      return listo
    },
    flush(): string {
      const resto = re ? comillasEnTitulos(pendiente, titulos) : pendiente
      pendiente = ''
      return resto
    },
  }
}
