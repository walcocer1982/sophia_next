'use client'

/**
 * Leer en voz alta con la voz del navegador (`speechSynthesis`), gratis y sin
 * espera: empieza a hablar al tocar. Reemplaza al texto a voz de OpenAI
 * (retirado el 14 oct 2026). Elige la mejor voz en español disponible
 * (lib/voz.ts) y lee por oraciones, porque Chrome corta las lecturas largas.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { elegirVoz, textoParaLeer } from '@/lib/voz'

const sinSuscripcion = () => () => {}
const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function useLectura() {
  // En el servidor no hay voz; en el navegador se pregunta sin efecto (sin parpadeo de hidratación).
  const soportado = useSyncExternalStore(sinSuscripcion, hayVoz, () => false)
  const [leyendo, setLeyendo] = useState<string | null>(null)
  const voz = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const cargar = () => {
      voz.current = elegirVoz(window.speechSynthesis.getVoices())
    }
    cargar()
    window.speechSynthesis.addEventListener('voiceschanged', cargar)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', cargar)
      window.speechSynthesis.cancel()
    }
  }, [])

  const detener = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setLeyendo(null)
  }, [])

  /** Lee el texto (markdown de Sophia). `id` permite saber qué mensaje se está leyendo. */
  const leer = useCallback((texto: string, id = 'texto') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const trozos = textoParaLeer(texto)
    if (!trozos.length) return
    window.speechSynthesis.cancel()
    if (!voz.current) voz.current = elegirVoz(window.speechSynthesis.getVoices())
    setLeyendo(id)
    trozos.forEach((trozo, i) => {
      const u = new SpeechSynthesisUtterance(trozo)
      if (voz.current) u.voice = voz.current
      u.lang = voz.current?.lang ?? 'es-PE'
      u.rate = 1
      if (i === trozos.length - 1) {
        u.onend = () => setLeyendo((actual) => (actual === id ? null : actual))
      }
      u.onerror = () => setLeyendo((actual) => (actual === id ? null : actual))
      window.speechSynthesis.speak(u)
    })
  }, [])

  return { soportado, leyendo, leer, detener }
}
