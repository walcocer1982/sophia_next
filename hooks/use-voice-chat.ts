'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { detectHallucination } from '@/lib/hallucination-detector'
import { streamChatResponse } from '@/lib/chat-stream'

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

/**
 * useVoiceChat — Nueva arquitectura (2026-06-02 migración):
 *
 *   Estudiante habla → OpenAI Realtime modo transcription-only (oídos)
 *                    → Claude /api/chat/stream (cerebro)
 *                    → OpenAI gpt-4o-mini-tts /api/voice/speak (boca)
 *                    → Estudiante escucha
 *
 * Claude es el cerebro único — la pedagogía es idéntica a la del modo
 * texto (rubric, escalada, scaffolding, turn-taking, cierre).
 *
 * OpenAI Realtime YA NO genera respuestas. Solo transcribe.
 * Por eso desaparecen todos los handlers de response.* y los guards
 * contra auto-chain — no es posible auto-encadenamiento porque no hay
 * cerebro LLM en OpenAI que decida hablar por su cuenta.
 */
export function useVoiceChat({
  sessionId,
  onTranscript,
  onAssistantStreamStart,
  onAssistantStreamDelta,
  onAssistantStreamDone,
}: UseVoiceChatArgs) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const recordingStartRef = useRef<number>(0)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackUrlRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const MIN_RECORDING_MS = 800

  const sendEvent = useCallback((event: object) => {
    const dc = dataChannelRef.current
    if (dc?.readyState === 'open') {
      dc.send(JSON.stringify(event))
    }
  }, [])

  const stopPlayback = useCallback(() => {
    const audio = playbackAudioRef.current
    if (audio) {
      try {
        audio.pause()
        audio.src = ''
      } catch {
        /* ignore */
      }
      playbackAudioRef.current = null
    }
    if (playbackUrlRef.current) {
      try {
        URL.revokeObjectURL(playbackUrlRef.current)
      } catch {
        /* ignore */
      }
      playbackUrlRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    stopPlayback()
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close() } catch { /* ignore */ }
      dataChannelRef.current = null
    }
    if (peerRef.current) {
      try { peerRef.current.close() } catch { /* ignore */ }
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch { /* ignore */ } })
      localStreamRef.current = null
    }
    setState('idle')
  }, [stopPlayback])

  /**
   * Sintetiza el texto con gpt-4o-mini-tts y lo reproduce.
   * Resuelve cuando el audio termina (o si falla).
   */
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return
    setState('speaking')

    try {
      const ttsRes = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!ttsRes.ok) {
        throw new Error(`TTS failed: ${ttsRes.status}`)
      }
      const blob = await ttsRes.blob()
      const url = URL.createObjectURL(blob)

      // Limpiar reproducción anterior si la hubo
      stopPlayback()
      playbackUrlRef.current = url

      const audio = new Audio()
      playbackAudioRef.current = audio
      audio.src = url
      audio.preload = 'auto'

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          stopPlayback()
          resolve()
        }
        audio.onerror = () => {
          console.warn('[Voice] Audio playback error')
          stopPlayback()
          resolve()
        }
        audio.play().catch((e) => {
          console.warn('[Voice] play() rejected:', e)
          resolve()
        })
      })
    } catch (e) {
      console.error('[Voice] speak error:', e)
    }
  }, [stopPlayback])

  /**
   * Manda el transcript del estudiante a Claude vía /api/chat/stream,
   * acumula el response streaming, y luego sintetiza con TTS.
   */
  const processWithClaude = useCallback(async (userTranscript: string) => {
    onTranscript?.({ role: 'user', content: userTranscript })

    // Guardar el mensaje del usuario en DB (vía /api/voice/message). Eso ya
    // dispara verificación + actualiza ActivityProgress (commit bbc9cbd).
    try {
      await fetch('/api/voice/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, role: 'user', content: userTranscript }),
      })
    } catch (e) {
      console.warn('[Voice] save user message failed:', e)
    }

    const assistantId = `voice-asst-${Date.now()}`
    onAssistantStreamStart?.(assistantId)

    let accumulated = ''

    await new Promise<void>((resolve) => {
      streamChatResponse(
        sessionId,
        userTranscript,
        (chunk) => {
          accumulated += chunk
          onAssistantStreamDelta?.(assistantId, chunk)
        },
        () => {
          onAssistantStreamDone?.(assistantId)
          resolve()
        },
        () => {
          console.warn('[Voice] Claude stream errored')
          resolve()
        },
      )
    })

    // Hablar la respuesta completa de Claude. NOTE: futuro optimización =
    // hablar por oraciones (TTS chunked) mientras Claude termina de stream.
    if (accumulated.trim()) {
      onTranscript?.({ role: 'assistant', content: accumulated })
      await speak(accumulated)
    }

    setState('ready')
  }, [sessionId, onTranscript, onAssistantStreamStart, onAssistantStreamDelta, onAssistantStreamDone, speak])

  const handleServerEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      // Streaming del transcript del estudiante (deltas) — opcional mostrarlo
      // en UI mientras habla. Lo dejamos como log por ahora.
      if (data.type === 'conversation.item.input_audio_transcription.delta') {
        // No-op: el transcript en deltas no se persiste, solo se confirma en .completed
        return
      }

      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript: string = (data.transcript || '').trim()

        // Filtro de hallucinations: si Whisper transcribió ruido, descartamos
        // y dejamos al estudiante hablar de nuevo sin gastar un turno con Claude.
        const youtubePatterns = [
          /subt[íi]tulos? (realizados|por) .*amara/i,
          /m[áa]s informaci[óo]n.*\.(com|org|es)/i,
          /^you you/i,
          /^thanks for watching/i,
          /^thank you( for watching)?$/i,
          /^suscr[íi]bete/i,
          /^\.+$/,
          /^\s*$/,
        ]
        const matchesYoutube = !transcript || youtubePatterns.some(p => p.test(transcript))
        const broadCheck = detectHallucination(transcript)
        if (matchesYoutube || broadCheck.isHallucination) {
          console.warn('[Voice] hallucination descartada:', transcript, broadCheck.reason || '')
          setState('ready')
          return
        }

        // Llamar a Claude + TTS (async — no bloqueamos el event loop)
        processWithClaude(transcript).catch((e) => {
          console.error('[Voice] processWithClaude error:', e)
          setState('ready')
        })
        return
      }

      if (data.type === 'error') {
        console.error('[Voice] Realtime error:', data)
        setError(data.error?.message || 'Voice error')
        setState('error')
      }
    } catch (e) {
      console.error('[Voice] event parse error:', e)
    }
  }, [processWithClaude])

  const connect = useCallback(async () => {
    setError(null)
    setState('connecting')

    try {
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
        const detail = (errBody as { openaiDetail?: string; openaiStatus?: number }).openaiDetail
          ? ` (OpenAI ${(errBody as { openaiStatus?: number }).openaiStatus}: ${(errBody as { openaiDetail?: string }).openaiDetail?.slice(0, 120)})`
          : ''
        throw new Error(`No se pudo iniciar la voz${detail}. Probá con el botón Escribir.`)
      }
      const { client_secret } = await tokenRes.json()

      const pc = new RTCPeerConnection()
      peerRef.current = pc

      let stream: MediaStream
      try {
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
      stream.getAudioTracks().forEach(t => { t.enabled = false })
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      dc.addEventListener('message', handleServerEvent)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // SDP exchange con OpenAI Realtime. Mismo endpoint que antes; el modo
      // transcription-only ya viene definido en el token efímero (server-side).
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
      })
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

  const startRecording = useCallback(() => {
    if (state !== 'ready') return
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach(t => { t.enabled = true })
    recordingStartRef.current = Date.now()
    setState('recording')
  }, [state])

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return
    const stream = localStreamRef.current
    if (!stream) return

    const elapsed = Date.now() - recordingStartRef.current
    if (elapsed < MIN_RECORDING_MS) {
      setError(`Habla un poco más (mínimo ${Math.ceil(MIN_RECORDING_MS / 1000)}s)`)
      setTimeout(() => setError(null), 2000)
      return
    }

    stream.getAudioTracks().forEach(t => { t.enabled = false })
    setState('processing')
    // Solo committeamos el audio buffer — eso dispara la transcripción de
    // Whisper en el server. NO mandamos response.create (no hay respuesta
    // de OpenAI en modo transcription-only).
    sendEvent({ type: 'input_audio_buffer.commit' })
  }, [state, sendEvent])

  const disconnect = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Función de "reset" si quedó atascado. Cancela cualquier stream/playback
  // en curso y vuelve a 'ready' (no rompe la conexión WebRTC).
  const forceReady = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    stopPlayback()
    setState('ready')
    setError(null)
  }, [stopPlayback])

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
