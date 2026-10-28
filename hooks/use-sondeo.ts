'use client'

import { useEffect, useRef } from 'react'

/**
 * Llama a `consultar` cada `intervaloMs`, pero solo con la pestaña a la vista.
 * Al volver a la pestaña consulta en el momento y retoma el ritmo. Con
 * `intervaloMs` en null no sondea. Con `inmediato`, consulta también al arrancar.
 *
 * 27 oct 2026: Neon cobra por las horas que la base está despierta y la duerme a
 * los 5 minutos sin consultas. El Monitor (cada 15 s) y la pantalla del alumno
 * (cada 4 s) sondeaban también con la pestaña oculta u olvidada, así que la base
 * no dormía nunca y el proyecto agotó su cuota mensual.
 */
export function useSondeo(consultar: () => void, intervaloMs: number | null, opciones: { inmediato?: boolean } = {}) {
  const inmediato = opciones.inmediato === true
  const ultima = useRef(consultar)
  useEffect(() => {
    ultima.current = consultar
  }, [consultar])

  useEffect(() => {
    if (intervaloMs === null) return
    let id: ReturnType<typeof setInterval> | null = null
    const arrancar = () => {
      if (id === null) id = setInterval(() => ultima.current(), intervaloMs)
    }
    const parar = () => {
      if (id !== null) clearInterval(id)
      id = null
    }
    const alCambiar = () => {
      if (document.visibilityState === 'visible') {
        ultima.current()
        arrancar()
      } else {
        parar()
      }
    }
    if (document.visibilityState === 'visible') {
      if (inmediato) ultima.current()
      arrancar()
    }
    document.addEventListener('visibilitychange', alCambiar)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', alCambiar)
    }
  }, [intervaloMs, inmediato])
}
