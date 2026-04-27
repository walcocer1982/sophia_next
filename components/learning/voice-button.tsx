'use client'

import { Mic, Loader2, PhoneOff, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import type { OptimisticMessage } from '@/types/chat'

interface VoiceButtonProps {
  sessionId: string
  onMessage?: (message: OptimisticMessage) => void
  onStreamStart?: (id: string) => void
  onStreamDelta?: (id: string, delta: string) => void
  onStreamDone?: (id: string) => void
  disabled?: boolean
}

export function VoiceButton({
  sessionId,
  onMessage,
  onStreamStart,
  onStreamDelta,
  onStreamDone,
  disabled,
}: VoiceButtonProps) {
  const {
    state,
    error,
    isConnected,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    forceReady,
  } = useVoiceChat({
    sessionId,
    onTranscript: (t) => {
      // Only used for user transcripts (assistant uses streaming below)
      if (t.role === 'user') {
        onMessage?.({
          id: `voice-${Date.now()}-user`,
          sessionId,
          role: 'user',
          content: t.content,
          createdAt: new Date(),
          status: 'completed',
          isOptimistic: false,
        })
      }
    },
    onAssistantStreamStart: onStreamStart,
    onAssistantStreamDelta: onStreamDelta,
    onAssistantStreamDone: onStreamDone,
  })

  // Status label for the user
  const getStatusLabel = () => {
    switch (state) {
      case 'idle': return ''
      case 'connecting': return 'Conectando...'
      case 'ready': return 'Click el micrófono para hablar'
      case 'recording': return 'Habla ahora, luego click para enviar'
      case 'processing': return 'Procesando tu mensaje...'
      case 'speaking': return 'Sophia está respondiendo...'
      case 'error': return error || 'Error'
    }
  }

  // Not connected: show "Activate voice" button
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={connect}
          disabled={disabled || state === 'connecting'}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {state === 'connecting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {state === 'connecting' ? 'Conectando...' : 'Activar voz'}
          </span>
        </Button>
        {error && <span className="text-[10px] text-red-600">{error}</span>}
      </div>
    )
  }

  // Connected: tap-to-talk (click to start, click to send)
  const canStart = state === 'ready'
  const isRecording = state === 'recording'
  const isBusy = state === 'processing' || state === 'speaking'

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else if (canStart) {
      startRecording()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={handleMicClick}
        disabled={!canStart && !isRecording}
        variant={isRecording ? 'destructive' : 'default'}
        size="sm"
        className={`gap-1.5 select-none ${isRecording ? 'animate-pulse' : ''}`}
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isRecording
            ? 'Click para enviar'
            : isBusy
              ? 'Espera...'
              : 'Click para hablar'}
        </span>
      </Button>

      <span className="text-xs text-gray-500">{getStatusLabel()}</span>

      {isBusy && (
        <Button
          type="button"
          onClick={forceReady}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Reiniciar (si Sophia se trabó)"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        type="button"
        onClick={disconnect}
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Desconectar voz"
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
