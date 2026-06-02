'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { detectHallucination } from '@/lib/hallucination-detector'

type VoiceState = 'idle' | 'connecting' | 'ready' | 'recording' | 'processing' | 'speaking' | 'error'

interface VoiceTranscript {
  role: 'user' | 'assistant'
  content: string
}

interface UseVoiceChatArgs {
  sessionId: string
  onTranscript?: (transcript: VoiceTranscript) => void
  onAssistantStreamStart?: (messageId: string) => void
  onAssistantStreamDelta?: (messageId: string, delta: string) => void
  onAssistantStreamDone?: (messageId: string) => void
}

export function useVoiceChat({
  sessionId,
  onTranscript,
  onAssistantStreamStart,
  onAssistantStreamDelta,
  onAssistantStreamDone,
}: UseVoiceChatArgs) {
  const currentResponseIdRef = useRef<string | null>(null)
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioSenderRef = useRef<RTCRtpSender | null>(null)
  const recordingStartRef = useRef<number>(0)
  const stuckTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Guard contra auto-encadenamiento: si el server emite response.created
  // mientras Sophia todavía está respondiendo, cancelamos la nueva respuesta.
  // Evita el patrón observado donde Sophia hablaba 2-3 veces seguidas sin
  // que el estudiante respondiera.
  const responseInFlightRef = useRef<boolean>(false)
  // Guard contra auto-chain DELAYED: marcamos true cuando NOSOTROS enviamos
  // response.create (en stopRecording). Si llega response.created sin que lo
  // hayamos pedido, es el server iniciándose solo → cancelamos.
  // Inicial true para permitir el welcome (que el server inicia automáticamente
  // tras connect).
  const weRequestedResponseRef = useRef<boolean>(true)
  const MIN_RECORDING_MS = 1500 // Minimum 1.5 seconds to ensure complete sentence
  const STUCK_TIMEOUT_MS = 30000 // Reset to ready if stuck in processing/speaking for 30s
  const IDLE_AFTER_DELTA_MS = 5000 // If no audio delta for 5s, response likely ended

  const clearStuckTimer = () => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current)
      stuckTimerRef.current = null
    }
  }

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current.remove()
      audioElementRef.current = null
    }
    audioSenderRef.current = null
    setState('idle')
  }, [])

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    try {
      await fetch('/api/voice/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, role, content }),
      })
      onTranscript?.({ role, content })
    } catch (e) {
      console.error('Error saving voice message:', e)
    }
  }, [sessionId, onTranscript])

  const sendEvent = useCallback((event: object) => {
    const dc = dataChannelRef.current
    if (dc?.readyState === 'open') {
      dc.send(JSON.stringify(event))
    }
  }, [])

  const handleServerEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      // Guard contra auto-encadenamiento (inmediato + delayed):
      // - Inmediato: response.created mientras Sophia todavía habla → cancelar
      // - Delayed: response.created que NO pedimos nosotros → cancelar
      //   (el server se inició solo sin que stopRecording haya enviado response.create)
      if (data.type === 'response.created') {
        if (responseInFlightRef.current) {
          console.warn('[Voice] response.created mientras anterior en curso — cancelando duplicada')
          const dc = dataChannelRef.current
          if (dc?.readyState === 'open') {
            dc.send(JSON.stringify({ type: 'response.cancel' }))
          }
          return
        }
        if (!weRequestedResponseRef.current) {
          console.warn('[Voice] response.created sin que lo hayamos pedido — cancelando auto-chain server-initiated')
          const dc = dataChannelRef.current
          if (dc?.readyState === 'open') {
            dc.send(JSON.stringify({ type: 'response.cancel' }))
          }
          return
        }
        responseInFlightRef.current = true
        weRequestedResponseRef.current = false // se vuelve true cuando stopRecording envíe response.create
      }

      // Log important events for debugging truncation
      if (
        data.type === 'response.done' ||
        data.type === 'response.cancelled' ||
        data.type === 'error' ||
        data.type === 'rate_limits.updated'
      ) {
        console.log('[Voice]', data.type, data)
        if (data.type === 'response.done' && data.response?.status_details) {
          console.warn('[Voice] Response ended:', data.response.status_details)
        }
        // Liberar el guard cuando la respuesta termina (done/cancelled/error)
        if (data.type !== 'rate_limits.updated') {
          responseInFlightRef.current = false
        }
      }

      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = data.transcript?.trim() || ''
        // Patrones específicos de hallucinations clásicas de Whisper en silencio
        // (videos de YouTube traducidos, suscripciones, créditos, etc).
        const youtubeStylePatterns = [
          /subt[íi]tulos? (realizados|por) .*amara/i,
          /m[áa]s informaci[óo]n.*\.(com|org|es)/i,
          /^you you/i,
          /^thanks for watching/i,
          /^thank you( for watching)?$/i,
          /^suscr[íi]bete/i,
          /^\.+$/,
          /^\s*$/,
        ]
        const matchesYoutubePattern = !transcript || youtubeStylePatterns.some(p => p.test(transcript))
        // Detector más amplio del lado server: mezcla de idiomas, sopa de mayúsculas,
        // palabras foráneas. Cubre casos como "ADRIAN PORDA ALFARONE" o transcripciones
        // multi-idioma observadas en sesiones reales.
        const broadCheck = detectHallucination(transcript)
        const isHallucination = matchesYoutubePattern || broadCheck.isHallucination
        if (isHallucination) {
          // NO cancelamos la respuesta de Sophia aunque Whisper haya hallucinated.
          // La respuesta de Sophia se genera del AUDIO original (que puede ser
          // valido aunque la transcripcion sea basura). Si cancelamos, cortamos
          // a Sophia a media frase — exactamente el bug que el usuario reporto.
          // Solo descartamos el transcript del estudiante para no contaminar la DB.
          console.warn('[Voice] Whisper hallucination detected — solo descartando transcript (no cancelando Sophia):', transcript, broadCheck.reason || '')
          return
        }
        saveMessage('user', transcript)
      }

      // Stream assistant transcript in real-time.
      // OpenAI GA renombró estos eventos: 'response.audio_transcript.*' (beta)
      // ahora son 'response.output_audio_transcript.*'. Aceptamos ambos por
      // compatibilidad — `response.done` no cambió.
      if (
        data.type === 'response.output_audio_transcript.delta' ||
        data.type === 'response.audio_transcript.delta'
      ) {
        if (!currentResponseIdRef.current) {
          currentResponseIdRef.current = `voice-asst-${Date.now()}`
          onAssistantStreamStart?.(currentResponseIdRef.current)
        }
        if (data.delta) {
          onAssistantStreamDelta?.(currentResponseIdRef.current, data.delta)
        }
      }

      if (
        data.type === 'response.output_audio_transcript.done' ||
        data.type === 'response.audio_transcript.done'
      ) {
        const transcript = data.transcript?.trim()
        if (transcript) {
          // Save to DB but don't re-emit to UI (already streamed)
          fetch('/api/voice/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, role: 'assistant', content: transcript }),
          }).catch(e => console.error('Error saving voice message:', e))
        }
        if (currentResponseIdRef.current) {
          onAssistantStreamDone?.(currentResponseIdRef.current)
          currentResponseIdRef.current = null
        }
      }

      if (
        data.type === 'response.output_audio.delta' ||
        data.type === 'response.audio.delta' ||
        data.type === 'response.output_audio_transcript.delta' ||
        data.type === 'response.audio_transcript.delta'
      ) {
        setState('speaking')
        // Reset stuck timer on each delta
        clearStuckTimer()
        stuckTimerRef.current = setTimeout(() => {
          console.warn('Voice stuck timeout, forcing ready state')
          setState('ready')
        }, STUCK_TIMEOUT_MS)

        // Reset idle timer - if no new delta for IDLE_AFTER_DELTA_MS, assume response ended
        clearIdleTimer()
        idleTimerRef.current = setTimeout(() => {
          console.warn('No audio delta for 5s, assuming response ended')
          if (currentResponseIdRef.current) {
            onAssistantStreamDone?.(currentResponseIdRef.current)
            currentResponseIdRef.current = null
          }
          setState('ready')
        }, IDLE_AFTER_DELTA_MS)
      }

      // Audio is actually playing on the client (more reliable than response.done)
      if (data.type === 'output_audio_buffer.started') {
        setState('speaking')
      }

      // Audio playback finished on the client (real end of Sophia talking)
      if (data.type === 'output_audio_buffer.stopped') {
        clearStuckTimer()
        clearIdleTimer()
        if (currentResponseIdRef.current) {
          onAssistantStreamDone?.(currentResponseIdRef.current)
          currentResponseIdRef.current = null
        }
        setState('ready')
      }

      // Server finished generating, but audio may still be playing - don't change state yet
      if (data.type === 'response.done') {
        clearStuckTimer()

        // Detect truncation by content filter (known OpenAI bug with Spanish)
        const status = data.response?.status
        const reason = data.response?.status_details?.reason
        if (status === 'incomplete') {
          if (reason === 'content_filter') {
            setError('La respuesta fue cortada por el filtro de contenido. Intenta reformular tu pregunta.')
            setTimeout(() => setError(null), 6000)
          } else if (reason === 'max_output_tokens') {
            setError('La respuesta fue muy larga y se cortó. Pídele a Sophia que sea más breve.')
            setTimeout(() => setError(null), 6000)
          }
        }

        // Fallback: if output_audio_buffer.stopped doesn't fire within 5s, force ready
        clearIdleTimer()
        idleTimerRef.current = setTimeout(() => {
          if (currentResponseIdRef.current) {
            onAssistantStreamDone?.(currentResponseIdRef.current)
            currentResponseIdRef.current = null
          }
          setState('ready')
        }, IDLE_AFTER_DELTA_MS)
      }

      if (data.type === 'response.cancelled') {
        clearStuckTimer()
        clearIdleTimer()
        if (currentResponseIdRef.current) {
          onAssistantStreamDone?.(currentResponseIdRef.current)
          currentResponseIdRef.current = null
        }
        setState('ready')
      }

      if (data.type === 'error') {
        const msg: string = data.error?.message || 'Voice error'
        // "Cancellation failed: no active response found" es esperable cuando
        // nuestro guard pide cancelar pero el server ya cerró la respuesta sola
        // (race condition benigna). NO mostrar al usuario, solo loguear.
        const isBenignCancel = /cancellation failed.*no active response/i.test(msg)
        if (isBenignCancel) {
          console.warn('[Voice] cancel race (no active response — ignorando):', msg)
          return
        }
        console.error('Realtime error:', data)
        setError(msg)
        clearStuckTimer()
        setState('error')
      }
    } catch (e) {
      console.error('Error parsing server event:', e)
    }
  }, [saveMessage])

  const connect = useCallback(async () => {
    setError(null)
    setState('connecting')

    try {
      // 1) Verificar que haya micrófono ANTES de pedir token a OpenAI
      //    (sino gastamos un token efímero que nunca usaremos)
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta micrófono. Usá la opción de Escribir.')
      }

      const tokenRes = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!tokenRes.ok) {
        const errBody = await tokenRes.json().catch(() => ({}))
        const detail = errBody.openaiDetail
          ? ` (OpenAI ${errBody.openaiStatus}: ${errBody.openaiDetail.slice(0, 120)})`
          : ''
        throw new Error(`No se pudo iniciar la voz${detail}. Probá con el botón Escribir.`)
      }
      const { client_secret } = await tokenRes.json()

      const pc = new RTCPeerConnection()
      peerRef.current = pc

      let audioEl = audioElementRef.current
      if (!audioEl) {
        audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioEl.setAttribute('playsinline', '')
        // Append to body so browsers will play it (required by some autoplay policies)
        document.body.appendChild(audioEl)
        audioElementRef.current = audioEl
      }
      pc.ontrack = (e) => {
        if (audioEl) {
          audioEl.srcObject = e.streams[0]
          audioEl.play().catch(err => console.warn('Audio play failed:', err))
        }
      }

      let stream: MediaStream
      try {
        // Audio constraints específicas para llamadas con WebRTC:
        // - echoCancellation: evita que el mic capture la voz de Sophia desde
        //   los parlantes (causa típica de entrecortado + loops de audio).
        // - noiseSuppression: reduce ruido ambiente (ventiladores, gente cerca).
        // - autoGainControl: nivela el volumen del estudiante (que puede estar
        //   lejos o cerca del micrófono).
        // - sampleRate: 24kHz coincide con lo que OpenAI Realtime usa internamente,
        //   evitando resampling extra que introduce latencia y artefactos.
        // - channelCount: 1 (mono) — basta para voz y reduce ancho de banda.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000,
            channelCount: 1,
          },
        })
      } catch (mediaErr) {
        const name = (mediaErr as Error).name
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          throw new Error('No se detectó un micrófono en este dispositivo. Usá la opción de Escribir.')
        }
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw new Error('Permiso de micrófono denegado. Habilitalo en tu navegador o usá la opción de Escribir.')
        }
        if (name === 'NotReadableError') {
          throw new Error('El micrófono está siendo usado por otra app. Cerrala y volvé a intentar, o usá Escribir.')
        }
        throw mediaErr
      }
      localStreamRef.current = stream
      // Start with mic muted (push-to-talk)
      stream.getAudioTracks().forEach(t => { t.enabled = false })
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream)
        if (track.kind === 'audio') audioSenderRef.current = sender
      })

      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      dc.addEventListener('message', handleServerEvent)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // SDP exchange: OpenAI cambió a /v1/realtime/calls. El modelo y demás
      // config viven en el token efímero (server-side), ya no van en URL params.
      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime/calls',
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
        }
      )
      if (!sdpResponse.ok) throw new Error('SDP exchange failed')
      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setState('ready')
    } catch (e) {
      console.error('Voice connect error:', e)
      setError((e as Error).message)
      setState('error')
      cleanup()
    }
  }, [sessionId, handleServerEvent, cleanup])

  // Push-to-talk: start recording (unmute mic)
  const startRecording = useCallback(() => {
    if (state !== 'ready') return
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach(t => { t.enabled = true })
    recordingStartRef.current = Date.now()
    setState('recording')
  }, [state])

  // Push-to-talk: stop and send (mute mic + commit + ask response)
  const stopRecording = useCallback(() => {
    if (state !== 'recording') return
    const stream = localStreamRef.current
    if (!stream) return

    // Enforce minimum recording duration to capture complete sentences
    const elapsed = Date.now() - recordingStartRef.current
    if (elapsed < MIN_RECORDING_MS) {
      setError(`Habla un poco más (mínimo ${Math.ceil(MIN_RECORDING_MS / 1000)}s)`)
      setTimeout(() => setError(null), 2000)
      return
    }

    stream.getAudioTracks().forEach(t => { t.enabled = false })
    setState('processing')
    sendEvent({ type: 'input_audio_buffer.commit' })
    // Marcar que nosotros pedimos la respuesta — el guard de auto-chain
    // necesita saber que esta respuesta es legítima (no iniciada por el server).
    weRequestedResponseRef.current = true
    sendEvent({ type: 'response.create' })
  }, [state, sendEvent])

  const disconnect = useCallback(() => {
    clearStuckTimer()
    clearIdleTimer()
    cleanup()
  }, [cleanup])

  // Force back to ready state if stuck (without disconnecting)
  const forceReady = useCallback(() => {
    clearStuckTimer()
    clearIdleTimer()
    sendEvent({ type: 'response.cancel' })
    if (currentResponseIdRef.current) {
      onAssistantStreamDone?.(currentResponseIdRef.current)
      currentResponseIdRef.current = null
    }
    setState('ready')
    setError(null)
  }, [sendEvent, onAssistantStreamDone])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    forceReady,
    state,
    error,
    isConnected: state !== 'idle' && state !== 'error',
    connect,
    disconnect,
    startRecording,
    stopRecording,
  }
}
