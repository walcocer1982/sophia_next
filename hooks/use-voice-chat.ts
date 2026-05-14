'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
      }

      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = data.transcript?.trim()
        // Filter known Whisper hallucinations on silence/low audio.
        // IMPORTANT: We do NOT cancel Sophia's response here, because the response
        // is generated directly from the AUDIO, not from this transcript.
        // Whisper may hallucinate the text even when the audio is clear and Sophia
        // is responding correctly to it.
        const hallucinationPatterns = [
          /subt[íi]tulos? (realizados|por) .*amara/i,
          /m[áa]s informaci[óo]n.*\.(com|org|es)/i, // www.alimmenta.com etc
          /^you you/i,
          /^thanks for watching/i,
          /^thank you( for watching)?$/i,
          /^suscr[íi]bete/i,
          /^\.+$/, // Just dots
          /^\s*$/, // Empty or whitespace
        ]
        const isHallucination = !transcript || hallucinationPatterns.some(p => p.test(transcript))
        if (isHallucination) {
          // Don't save and don't show error — Sophia's response is still valid (it comes from audio)
          console.warn('[Voice] Whisper hallucination detected, skipping transcript save:', transcript)
          return
        }
        saveMessage('user', transcript)
      }

      // Stream assistant transcript in real-time
      if (data.type === 'response.audio_transcript.delta') {
        if (!currentResponseIdRef.current) {
          currentResponseIdRef.current = `voice-asst-${Date.now()}`
          onAssistantStreamStart?.(currentResponseIdRef.current)
        }
        if (data.delta) {
          onAssistantStreamDelta?.(currentResponseIdRef.current, data.delta)
        }
      }

      if (data.type === 'response.audio_transcript.done') {
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

      if (data.type === 'response.audio.delta' || data.type === 'response.audio_transcript.delta') {
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
        console.error('Realtime error:', data)
        setError(data.error?.message || 'Voice error')
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
      const tokenRes = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!tokenRes.ok) throw new Error('Failed to get voice session token')
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-realtime',
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
