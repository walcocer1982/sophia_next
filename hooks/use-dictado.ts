'use client'

/**
 * Dictar con el reconocimiento de voz del navegador: gratis, en español de
 * Perú. Reemplaza a la transcripción en tiempo real de OpenAI (retirada el
 * 14 oct 2026). Funciona en Chrome y Edge (computadora y Android) y en Safari
 * de iPhone; en Firefox no existe y el micrófono no se muestra. En Chrome el
 * audio lo procesa Google.
 *
 * El texto dictado va a la caja de respuesta: el alumno lo revisa y lo envía,
 * como si lo hubiera escrito. Así viaja con el estado del ecualizador y pasa
 * por el mismo camino que un mensaje escrito.
 *
 * Pausas (20 oct 2026): el navegador corta el reconocimiento tras unos
 * segundos de silencio, y el alumno que se detenía a pensar tenía que volver a
 * grabar. Ahora se reanuda solo hasta que el alumno toca el micrófono para
 * terminar; tras SILENCIO_MAXIMO sin voz se apaga, para no dejarlo abierto.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

interface ResultadoDeVoz {
  isFinal: boolean
  0: { transcript: string }
}
interface EventoDeVoz {
  resultIndex: number
  results: ArrayLike<ResultadoDeVoz>
}
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: EventoDeVoz) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
type ConstructorDeReconocedor = new () => Reconocedor

function constructor(): ConstructorDeReconocedor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: ConstructorDeReconocedor; webkitSpeechRecognition?: ConstructorDeReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const sinSuscripcion = () => () => {}

/** Sin voz durante este tiempo, el dictado se apaga solo. */
const SILENCIO_MAXIMO = 20_000

export function useDictado({ onTexto, onError }: { onTexto: (texto: string) => void; onError?: (motivo: string) => void }) {
  const soportado = useSyncExternalStore(sinSuscripcion, () => constructor() !== null, () => false)
  const [escuchando, setEscuchando] = useState(false)
  const [parcial, setParcial] = useState('')
  const rec = useRef<Reconocedor | null>(null)
  const alTexto = useRef(onTexto)
  const alError = useRef(onError)
  useEffect(() => {
    alTexto.current = onTexto
    alError.current = onError
  }, [onTexto, onError])

  // true mientras el alumno quiera dictar: si el navegador corta por una pausa, se reanuda.
  const quiere = useRef(false)
  const ultimaVoz = useRef(0)
  const reanudacion = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arrancarRef = useRef<() => void>(() => {})

  const terminar = useCallback(() => {
    quiere.current = false
    if (reanudacion.current) clearTimeout(reanudacion.current)
    reanudacion.current = null
    rec.current = null
    setParcial('')
    setEscuchando(false)
  }, [])

  // Cada reanudación usa un reconocedor NUEVO, tras una pausa corta. Reiniciar
  // el mismo funcionaba en Chrome, pero en Edge el micrófono quedaba en rojo sin
  // transcribir nada más (prueba del 20 oct 2026).
  useEffect(() => {
    arrancarRef.current = () => {
      const Ctor = constructor()
      if (!Ctor) {
        terminar()
        return
      }
      const r = new Ctor()
      r.lang = 'es-PE'
      r.continuous = true
      r.interimResults = true
      r.onresult = (e) => {
        ultimaVoz.current = Date.now()
        let provisional = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          const texto = res[0].transcript.trim()
          if (res.isFinal) {
            if (texto) alTexto.current(texto)
          } else {
            provisional += `${texto} `
          }
        }
        setParcial(provisional.trim())
      }
      r.onerror = (e) => {
        // Silencio o corte propio: no es un error; al terminar se reanuda si el alumno sigue dictando.
        if (e.error === 'no-speech' || e.error === 'aborted') return
        terminar()
        alError.current?.(
          e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? 'El navegador no tiene permiso para usar el micrófono.'
            : 'No se pudo escuchar. Prueba de nuevo o escribe tu respuesta.',
        )
      }
      r.onend = () => {
        if (rec.current !== r) return
        setParcial('')
        if (quiere.current && Date.now() - ultimaVoz.current < SILENCIO_MAXIMO) {
          reanudacion.current = setTimeout(() => {
            reanudacion.current = null
            if (quiere.current) arrancarRef.current()
          }, 250)
          return
        }
        terminar()
      }
      rec.current = r
      try {
        r.start()
      } catch {
        terminar()
      }
    }
  }, [terminar])

  useEffect(
    () => () => {
      quiere.current = false
      if (reanudacion.current) clearTimeout(reanudacion.current)
      rec.current?.abort()
    },
    [],
  )

  const detener = useCallback(() => {
    quiere.current = false
    if (reanudacion.current) clearTimeout(reanudacion.current)
    reanudacion.current = null
    // Si está escuchando, al cerrar llega onend y termina; si estaba entre dos sesiones, se termina aquí.
    if (rec.current) rec.current.stop()
    else terminar()
  }, [terminar])

  const iniciar = useCallback(() => {
    if (!constructor() || quiere.current) return
    quiere.current = true
    ultimaVoz.current = Date.now()
    setEscuchando(true)
    arrancarRef.current()
  }, [])

  return { soportado, escuchando, parcial, iniciar, detener }
}
