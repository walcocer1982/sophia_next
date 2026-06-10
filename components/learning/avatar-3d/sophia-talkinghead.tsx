'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type TalkingHeadGesture =
  | 'handup'
  | 'index'
  | 'ok'
  | 'thumbup'
  | 'thumbdown'
  | 'side'
  | 'shrug'
  | 'namaste'

export type TalkingHeadMood =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'fear'
  | 'disgust'
  | 'love'
  | 'sleep'

export interface TalkingHeadHandle {
  gesture: (name: TalkingHeadGesture, dur?: number) => void
  stopGesture: () => void
  setMood: (name: TalkingHeadMood) => void
  loadAvatar: (url: string, body?: 'F' | 'M') => void
  speak: (text: string) => void
  /** Lip-sync con audio ya generado (MP3/wav ArrayBuffer) + texto para timing. */
  speakAudio: (audio: ArrayBuffer, text: string) => void
}

interface SophiaTalkingHeadProps {
  width?: number | string
  height?: number | string
  onReady?: () => void
  onError?: (message: string) => void
  /** Se dispara cuando empieza a reproducir audio/hablar. */
  onSpeaking?: () => void
  /** Se dispara cuando termina de hablar (marker al final del audio). */
  onSpeakEnd?: () => void
  /** Diagnóstico: cada evento/info del iframe (para panel de debug). */
  onInfo?: (msg: string) => void
}

/**
 * Motor de avatar 3D (TalkingHead) embebido en un iframe self-contained.
 *
 * El iframe (/public/talkinghead/avatar.html) carga TalkingHead + Three.js
 * desde CDN vía importmap — totalmente fuera del bundler de Next.js, así que
 * NO puede romper el build ni el resto de la app. La comunicación es por
 * postMessage.
 */
export const SophiaTalkingHead = forwardRef<TalkingHeadHandle, SophiaTalkingHeadProps>(
  function SophiaTalkingHead(
    { width = 360, height = 480, onReady, onError, onSpeaking, onSpeakEnd, onInfo },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [ready, setReady] = useState(false)
    const readyRef = useRef(false)
    // Cola de habla: si llaman speakAudio antes de que el avatar esté listo
    // (p. ej. el welcome), lo guardamos y lo reproducimos al estar listo.
    const pendingSpeak = useRef<Array<{ audio: ArrayBuffer; text: string }>>([])

    const send = (msg: Record<string, unknown>) => {
      const win = iframeRef.current?.contentWindow
      win?.postMessage({ target: 'talkinghead', ...msg }, '*')
    }

    const resumeIframeAudio = () => {
      try {
        const win = iframeRef.current?.contentWindow as
          | (Window & { thResumeAudio?: () => unknown })
          | null
        win?.thResumeAudio?.()
      } catch {
        /* ignore */
      }
    }

    useImperativeHandle(ref, () => ({
      gesture: (name, dur) => send({ action: 'gesture', name, dur }),
      stopGesture: () => send({ action: 'stopGesture' }),
      setMood: (name) => send({ action: 'mood', name }),
      loadAvatar: (url, body) => send({ action: 'avatar', url, body }),
      speak: (text) => send({ action: 'speak', text }),
      speakAudio: (audio, text) => {
        if (readyRef.current) {
          send({ action: 'speakAudio', audio, text })
        } else {
          // Aún no listo → encolar; se reproduce al recibir 'ready'.
          pendingSpeak.current.push({ audio, text })
        }
      },
    }))

    useEffect(() => {
      const onMessage = (e: MessageEvent) => {
        const d = e.data
        if (!d || d.source !== 'talkinghead') return
        if (d.type === 'ready') {
          readyRef.current = true
          setReady(true)
          onReady?.()
          onInfo?.('iframe READY')
          // Reanudar audio (hay activación persistente del click "Comenzar")
          // y vaciar la cola de habla pendiente (p. ej. el welcome).
          resumeIframeAudio()
          const queued = pendingSpeak.current
          pendingSpeak.current = []
          queued.forEach(({ audio, text }) =>
            send({ action: 'speakAudio', audio, text }),
          )
        } else if (d.type === 'error') {
          console.warn('[avatar3d:cmp] iframe ERROR:', d.message)
          onError?.(d.message)
          onInfo?.('ERROR: ' + d.message)
        } else if (d.type === 'speaking') {
          onSpeaking?.()
          onInfo?.('speaking')
        } else if (d.type === 'speakEnd') {
          onSpeakEnd?.()
          onInfo?.('speakEnd')
        } else if (d.type === 'info') {
          console.log('[talkinghead]', d.message)
          onInfo?.(d.message)
        }
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    }, [onReady, onError, onSpeaking, onSpeakEnd, onInfo])

    // Desbloqueo del AudioContext del iframe: su audio arranca suspendido por la
    // política de autoplay y el usuario nunca hace click DENTRO del iframe. Como
    // padre e iframe son mismo origen, reanudamos su AudioContext en cada gesto
    // del usuario sobre la página (una vez "running", se queda activo).
    useEffect(() => {
      const resume = () => {
        try {
          const win = iframeRef.current?.contentWindow as
            | (Window & { thResumeAudio?: () => unknown })
            | null
          const fn = win?.thResumeAudio
          console.log('[avatar3d:cmp] gesto -> resume audio, thResumeAudio?', !!fn)
          fn?.()
        } catch (e) {
          console.warn('[avatar3d:cmp] resume falló', e)
        }
      }
      // Fase de captura (true): el evento llega ANTES de que el textarea del
      // chat lo detenga con stopPropagation. Varios tipos para cubrir todo.
      const events = ['pointerdown', 'keydown', 'click', 'touchstart'] as const
      events.forEach((ev) => window.addEventListener(ev, resume, true))
      return () => events.forEach((ev) => window.removeEventListener(ev, resume, true))
    }, [])

    return (
      <div style={{ position: 'relative', width, height }}>
        <iframe
          ref={iframeRef}
          src="/talkinghead/avatar.html"
          title="Sophia TalkingHead"
          style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
          allow="autoplay"
        />
        {!ready && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          >
            Inicializando motor 3D…
          </div>
        )}
      </div>
    )
  },
)
