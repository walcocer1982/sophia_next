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

  useEffect(() => () => rec.current?.abort(), [])

  const detener = useCallback(() => {
    rec.current?.stop()
  }, [])

  const iniciar = useCallback(() => {
    const Ctor = constructor()
    if (!Ctor || rec.current) return
    const r = new Ctor()
    r.lang = 'es-PE'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
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
      if (e.error === 'no-speech' || e.error === 'aborted') return
      alError.current?.(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'El navegador no tiene permiso para usar el micrófono.'
          : 'No se pudo escuchar. Prueba de nuevo o escribe tu respuesta.',
      )
    }
    r.onend = () => {
      rec.current = null
      setEscuchando(false)
      setParcial('')
    }
    rec.current = r
    try {
      r.start()
      setEscuchando(true)
    } catch {
      rec.current = null
    }
  }, [])

  return { soportado, escuchando, parcial, iniciar, detener }
}
