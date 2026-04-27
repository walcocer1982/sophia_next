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
}

export function useVoiceChat({ sessionId, onTranscript }: UseVoiceChatArgs) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioSenderRef = useRef<RTCRtpSender | null>(null)
  const recordingStartRef = useRef<number>(0)
  const MIN_RECORDING_MS = 1500 // Minimum 1.5 seconds to ensure complete sentence

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
        if (transcript) saveMessage('user', transcript)
      }

      if (data.type === 'response.audio_transcript.done') {
        const transcript = data.transcript?.trim()
        if (transcript) saveMessage('assistant', transcript)
      }

      if (data.type === 'response.audio.delta') {
        setState('speaking')
      }

      if (data.type === 'response.done') {
        setState('ready')
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
        audioElementRef.current = audioEl
      }
      pc.ontrack = (e) => {
        if (audioEl) audioEl.srcObject = e.streams[0]
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
    cleanup()
  }, [cleanup])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    state,
    error,
    isConnected: state !== 'idle' && state !== 'error',
    connect,
    disconnect,
    startRecording,
    stopRecording,
  }
}
