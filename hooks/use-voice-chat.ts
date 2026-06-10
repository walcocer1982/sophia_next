'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { detectHallucination } from '@/lib/hallucination-detector'
import { streamChatResponse } from '@/lib/chat-stream'
import { getUnlockedAudio } from '@/lib/audio-unlock'

type VoiceState = 'idle' | 'connecting' | 'ready' | 'recording' | 'processing' | 'speaking' | 'error'

interface VoiceTranscript {
  role: 'user' | 'assistant'
  content: string
}

interface UseVoiceChatArgs {
  sessionId: string
  /** Idioma de la sesión — se pasa al endpoint TTS para que la voz coral
   * pronuncie correctamente el inglés en vez de leerlo con acento español. */
  language?: 'ES' | 'EN'
  onTranscript?: (transcript: VoiceTranscript) => void
  onAssistantStreamStart?: (messageId: string) => void
  onAssistantStreamDelta?: (messageId: string, delta: string) => void
  onAssistantStreamDone?: (messageId: string) => void
  /** Si se provee, cada oración de audio se reproduce por aquí (p. ej. avatar
   * 3D con lip-sync) en vez de con un <audio> interno. Debe resolver cuando el
   * audio termina, para serializar las oraciones. */
  onSpeakChunk?: (audioBlob: Blob, text: string) => Promise<void>
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
  language = 'ES',
  onTranscript,
  onAssistantStreamStart,
  onAssistantStreamDelta,
  onAssistantStreamDone,
  onSpeakChunk,
}: UseVoiceChatArgs) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  // Ref para usar el callback más reciente dentro de playFromQueue (useCallback []).
  const onSpeakChunkRef = useRef(onSpeakChunk)
  onSpeakChunkRef.current = onSpeakChunk

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const recordingStartRef = useRef<number>(0)
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackUrlRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Cola de oraciones para TTS chunked. Cada entrada tiene el TEXTO y la
  // promesa del audio. La sincronización texto+voz se hace cuando empieza
  // a reproducirse cada oración: ahí se revela el texto en la UI.
  // Esto evita que el estudiante vea el texto antes de oírlo.
  type QueuedSentence = { text: string; blobPromise: Promise<Blob | null> }
  const speakQueueRef = useRef<QueuedSentence[]>([])
  const isPlayingQueueRef = useRef<boolean>(false)
  const cancelPlaybackRef = useRef<boolean>(false)
  // ID del mensaje de Sophia en la UI — usado para revelar texto sincronizado
  // con el audio. Se setea al inicio de cada turno.
  const currentAssistantIdRef = useRef<string | null>(null)
  // Callbacks capturados por turno — los almacenamos en refs para que el
  // playFromQueue (que se invoca de modo "fire and forget") los pueda usar.
  const onDeltaRef = useRef<((id: string, delta: string) => void) | undefined>(undefined)
  const MIN_RECORDING_MS = 800
  const MIN_SENTENCE_CHARS = 20

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
    cancelPlaybackRef.current = true
    speakQueueRef.current = []
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
   * Sintetiza UNA oración con TTS — devuelve el blob (o null si falla).
   * Sin reproducción; eso lo hace el loop de la cola.
   */
  const synthesizeSentence = useCallback(async (text: string): Promise<Blob | null> => {
    const t0 = performance.now()
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      })
      if (!res.ok) {
        console.warn('[Voice] TTS sentence failed:', res.status)
        return null
      }
      const blob = await res.blob()
      console.log(`[timing] 🔊 TTS oración (${Math.round(performance.now() - t0)}ms): "${text.slice(0, 30)}..."`)
      return blob
    } catch (e) {
      console.warn('[Voice] TTS sentence error:', e)
      return null
    }
  }, [language])

  /**
   * Loop que consume la cola: toma la próxima entrada {text, blobPromise},
   * espera a que llegue el audio, REVELA el texto en la UI, lo reproduce,
   * espera a que termine, y sigue con la siguiente.
   *
   * Sincronización clave: el texto se muestra al estudiante AL MISMO TIEMPO
   * que el audio empieza a hablarlo. Antes el texto aparecía antes
   * (streaming de Claude) y el audio llegaba 1-2s después.
   */
  const playFromQueue = useCallback(async () => {
    if (isPlayingQueueRef.current) return
    isPlayingQueueRef.current = true
    setState('speaking')

    while (speakQueueRef.current.length > 0 && !cancelPlaybackRef.current) {
      const entry = speakQueueRef.current.shift()
      if (!entry) continue
      try {
        const tWait = performance.now()
        const blob = await entry.blobPromise
        const waitMs = Math.round(performance.now() - tWait)
        if (cancelPlaybackRef.current) continue
        // Revelar el texto en la UI EXACTAMENTE cuando arranca el audio.
        const assistantId = currentAssistantIdRef.current
        if (assistantId && onDeltaRef.current) {
          // Agregamos espacio entre oraciones para que se concatenen bien.
          const prefix = entry.text.startsWith(' ') ? '' : ' '
          onDeltaRef.current(assistantId, prefix + entry.text)
        }
        if (!blob) continue

        // Ruta avatar 3D (lip-sync): reproducir por el callback externo, que
        // resuelve cuando termina el audio (serializa las oraciones).
        if (onSpeakChunkRef.current) {
          const tPlay = performance.now()
          try {
            await onSpeakChunkRef.current(blob, entry.text)
          } catch (e) {
            console.warn('[Voice] onSpeakChunk error:', e)
          }
          console.log(`[timing] 🎭 Avatar habló oración: ${Math.round(performance.now() - tPlay)}ms (espera audio: ${waitMs}ms)`)
          continue
        }

        const url = URL.createObjectURL(blob)
        playbackUrlRef.current = url

        // Reusar el <audio> desbloqueado por gesto si existe (kiosko) — la
        // reproducción llega segundos después del clic del mic y un elemento
        // nuevo puede caer en el bloqueo de autoplay.
        const audio = getUnlockedAudio() ?? new Audio()
        playbackAudioRef.current = audio
        audio.src = url
        audio.preload = 'auto'

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve()
          audio.onerror = () => {
            console.warn('[Voice] audio chunk error')
            resolve()
          }
          audio.play().catch((e) => {
            console.warn('[Voice] play() rejected:', e)
            resolve()
          })
        })
        try { URL.revokeObjectURL(url) } catch { /* ignore */ }
        if (playbackUrlRef.current === url) playbackUrlRef.current = null
        if (playbackAudioRef.current === audio) playbackAudioRef.current = null
      } catch (e) {
        console.warn('[Voice] chunk playback error:', e)
      }
    }

    isPlayingQueueRef.current = false
  }, [])

  /**
   * Extrae oraciones completas del buffer y las agrega a la cola TTS.
   * Una "oración completa" termina en `.` `?` `!` seguidos de espacio o fin.
   * Devuelve el remainder (texto sin oración terminada todavía).
   *
   * Cada entrada de la cola es {text, blobPromise} — el fetch a TTS arranca
   * en paralelo (synthesizeSentence se llama acá) mientras Claude sigue
   * streameando. La sincronización con UI ocurre en playFromQueue.
   */
  const flushSentencesIntoQueue = useCallback((buffer: string): string => {
    const re = /([^.!?\n]+[.!?]+)(?=\s|$)/g
    let lastIdx = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(buffer)) !== null) {
      const sentence = match[1].trim().replace(/\s+/g, ' ')
      if (sentence.length >= MIN_SENTENCE_CHARS) {
        speakQueueRef.current.push({
          text: sentence,
          blobPromise: synthesizeSentence(sentence),
        })
      }
      lastIdx = match.index + match[0].length
    }
    return buffer.slice(lastIdx)
  }, [synthesizeSentence])

  /**
   * Manda el transcript del estudiante a Claude vía /api/chat/stream,
   * acumula el response streaming, y luego sintetiza con TTS.
   */
  const processWithClaude = useCallback(async (userTranscript: string) => {
    const tStart = performance.now()
    let firstTokenAt = 0
    console.log('[timing] ⏱️ ─── nueva respuesta ───')
    onTranscript?.({ role: 'user', content: userTranscript })

    // NOTA: NO guardamos via /api/voice/message acá. Despues de la migracion
    // a Whisper+Claude+TTS (commit 04c0e45), chat/stream es el unico responsable
    // de guardar el user message Y disparar la verificacion. Llamar a ambos
    // duplicaba el mensaje en DB e inflaba el conteo de intentos (caso real
    // observado con Alcocer: cada mensaje aparecia 2 veces, attempts inflados).

    const assistantId = `voice-asst-${Date.now()}`
    onAssistantStreamStart?.(assistantId)

    let accumulated = ''
    let sentenceBuffer = ''
    // Reset de la cola para este turno + capturar refs para playFromQueue
    speakQueueRef.current = []
    isPlayingQueueRef.current = false
    cancelPlaybackRef.current = false
    currentAssistantIdRef.current = assistantId
    onDeltaRef.current = onAssistantStreamDelta

    await new Promise<void>((resolve) => {
      streamChatResponse(
        sessionId,
        userTranscript,
        (chunk) => {
          if (!firstTokenAt) {
            firstTokenAt = performance.now()
            console.log(`[timing] 🧠 Claude primer token: ${Math.round(firstTokenAt - tStart)}ms`)
          }
          accumulated += chunk
          sentenceBuffer += chunk
          // IMPORTANTE: NO llamamos a onAssistantStreamDelta acá. El texto se
          // revela en la UI cuando arranca cada audio (playFromQueue), no
          // mientras Claude todavía está generándolo. Esto sincroniza texto+voz.
          const previousQueueLen = speakQueueRef.current.length
          sentenceBuffer = flushSentencesIntoQueue(sentenceBuffer)
          if (speakQueueRef.current.length > previousQueueLen) {
            playFromQueue()
          }
        },
        () => {
          console.log(`[timing] 🧠 Claude completo: ${Math.round(performance.now() - tStart)}ms`)
          resolve()
        },
        () => {
          console.warn('[Voice] Claude stream errored')
          resolve()
        },
      )
    })

    // Stream terminado: si quedó texto sin terminador (última "oración"
    // sin punto final), la encolamos también.
    if (sentenceBuffer.trim().length >= 3) {
      const lastText = sentenceBuffer.trim()
      speakQueueRef.current.push({
        text: lastText,
        blobPromise: synthesizeSentence(lastText),
      })
      playFromQueue()
    }

    if (accumulated.trim()) {
      onTranscript?.({ role: 'assistant', content: accumulated })
    }

    // Esperar a que la cola termine de reproducir (texto + audio).
    while (isPlayingQueueRef.current || speakQueueRef.current.length > 0) {
      await new Promise((r) => setTimeout(r, 100))
      if (cancelPlaybackRef.current) break
    }

    // Notificar fin del stream del asistente DESPUÉS de que termine el audio,
    // para que la UI marque el mensaje como completado solo cuando ya se
    // reveló todo el texto.
    onAssistantStreamDone?.(assistantId)
    currentAssistantIdRef.current = null
    onDeltaRef.current = undefined

    setState('ready')
  }, [sessionId, onTranscript, onAssistantStreamStart, onAssistantStreamDelta, onAssistantStreamDone, flushSentencesIntoQueue, playFromQueue, synthesizeSentence])

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
    cancelPlaybackRef.current = true
    speakQueueRef.current = []
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
