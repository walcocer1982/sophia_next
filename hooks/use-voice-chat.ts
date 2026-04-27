'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

interface VoiceTranscript {
  role: 'user' | 'assistant'
  content: string
}

interface UseVoiceChatArgs {
  sessionId: string
  onTranscript?: (transcript: VoiceTranscript) => void
}

export function useVoiceChat({ sessionId, onTranscript }: UseVoiceChatArgs) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

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
    }
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

  const handleServerEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      // User finished speaking, transcription completed
      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = data.transcript?.trim()
        if (transcript) saveMessage('user', transcript)
      }

      // Assistant finished speaking
      if (data.type === 'response.audio_transcript.done') {
        const transcript = data.transcript?.trim()
        if (transcript) saveMessage('assistant', transcript)
      }

      // Visual state updates
      if (data.type === 'input_audio_buffer.speech_started') {
        setState('listening')
      }
      if (data.type === 'response.audio.delta') {
        setState('speaking')
      }
      if (data.type === 'response.done') {
        setState('listening')
      }
      if (data.type === 'error') {
        console.error('Realtime error:', data)
        setError(data.error?.message || 'Voice error')
        setState('error')
      }
    } catch (e) {
      console.error('Error parsing server event:', e)
    }
  }, [saveMessage])

  const start = useCallback(async () => {
    setError(null)
    setState('connecting')

    try {
      // 1. Get ephemeral token from our server
      const tokenRes = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!tokenRes.ok) throw new Error('Failed to get voice session token')
      const { client_secret } = await tokenRes.json()

      // 2. Setup WebRTC peer connection
      const pc = new RTCPeerConnection()
      peerRef.current = pc

      // 3. Setup audio element to play remote audio
      let audioEl = audioElementRef.current
      if (!audioEl) {
        audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioElementRef.current = audioEl
      }
      pc.ontrack = (e) => {
        if (audioEl) audioEl.srcObject = e.streams[0]
      }

      // 4. Add local microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // 5. Setup data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      dc.addEventListener('message', handleServerEvent)

      // 6. Create offer and send to OpenAI
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

      setState('listening')
    } catch (e) {
      console.error('Voice start error:', e)
      setError((e as Error).message)
      setState('error')
      cleanup()
    }
  }, [sessionId, handleServerEvent, cleanup])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    state,
    error,
    isActive: state !== 'idle' && state !== 'error',
    start,
    stop,
  }
}
