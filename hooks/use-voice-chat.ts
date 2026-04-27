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
  const MIN_RECORDING_MS = 1500 // Minimum 1.5 seconds to ensure complete sentence
  const STUCK_TIMEOUT_MS = 30000 // Reset to ready if stuck in processing/speaking for 30s

  const clearStuckTimer = () => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current)
      stuckTimerRef.current = null
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

      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = data.transcript?.trim()
        // Filter known Whisper hallucinations on silence/low audio
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
          setError('No se entendió tu audio. Habla más fuerte y cerca del micrófono.')
          setTimeout(() => setError(null), 4000)
          // Cancel any in-flight response generation
          sendEvent({ type: 'response.cancel' })
          setState('ready')
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

      if (data.type === 'response.audio.delta') {
        setState('speaking')
        // Reset stuck timer on each delta - if no delta for 30s, force ready
        clearStuckTimer()
        stuckTimerRef.current = setTimeout(() => {
          console.warn('Voice stuck timeout, forcing ready state')
          setState('ready')
        }, STUCK_TIMEOUT_MS)
      }

      if (data.type === 'response.done' || data.type === 'response.cancelled') {
        clearStuckTimer()
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
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
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
    cleanup()
  }, [cleanup])

  // Force back to ready state if stuck (without disconnecting)
  const forceReady = useCallback(() => {
    clearStuckTimer()
    sendEvent({ type: 'response.cancel' })
    setState('ready')
    setError(null)
  }, [sendEvent])

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
