'use client'

import { useEffect, useRef } from 'react'
import { Mic, Loader2, RotateCw } from 'lucide-react'
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
  autoStart?: boolean // Auto-activate voice on mount (kiosko mode)
}

export function VoiceButton({
  sessionId,
  onMessage,
  onStreamStart,
  onStreamDelta,
  onStreamDone,
  disabled,
  autoStart = false,
}: VoiceButtonProps) {
  const {
    state,
    error,
    isConnected,
    connect,
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

  // Auto-start voice on mount if requested (kiosko mode)
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && !isConnected && !disabled) {
      autoStartedRef.current = true
      // Small delay to allow welcome message to render first
      const timer = setTimeout(() => connect(), 800)
      return () => clearTimeout(timer)
    }
  }, [autoStart, isConnected, disabled, connect])

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

      {/* Show error if any */}
      {error && <span className="text-xs text-red-600">{error}</span>}

      {/* Reset button only when stuck */}
      {isBusy && (
        <Button
          type="button"
          onClick={forceReady}
          variant="ghost"
          size="sm"
          className="text-xs text-gray-500 hover:text-gray-700"
          title="Reiniciar si se trabó"
        >
          <RotateCw className="h-3 w-3 mr-1" />
          Reiniciar
        </Button>
      )}
    </div>
  )
}
