/**
 * Desplaza SOLO el panel que contiene al elemento (la conversación o la
 * pizarra), nunca la página. `scrollIntoView` mueve todos los ancestros que se
 * puedan desplazar, también la ventana: en /learn subía la lección entera y
 * abajo aparecía una franja blanca (captura de Walther, 21 oct 2026).
 */
export type Alinear = 'inicio' | 'cercano'

export function desplazarDentro(contenedor: HTMLElement | null, elemento: Element | null, alinear: Alinear = 'inicio', suave = true): void {
  if (!contenedor || !elemento) return
  const caja = contenedor.getBoundingClientRect()
  const el = elemento.getBoundingClientRect()
  const margen = 16
  const arriba = el.top - caja.top + contenedor.scrollTop - margen
  let destino = arriba
  if (alinear === 'cercano') {
    const visibleArriba = el.top >= caja.top + margen
    const visibleAbajo = el.bottom <= caja.bottom - margen
    if (visibleArriba && visibleAbajo) return
    // Si cabe, que quede entero con su parte de abajo a la vista; si no cabe, desde arriba.
    const alto = el.height + margen * 2
    destino = !visibleArriba || alto > caja.height ? arriba : el.bottom - caja.top + contenedor.scrollTop - caja.height + margen
  }
  contenedor.scrollTo({ top: Math.max(0, destino), behavior: suave ? 'smooth' : 'auto' })
}

/** Al final del panel (el último mensaje del alumno a la vista). */
export function alFinal(contenedor: HTMLElement | null, suave = false): void {
  if (!contenedor) return
  contenedor.scrollTo({ top: contenedor.scrollHeight, behavior: suave ? 'smooth' : 'auto' })
}
