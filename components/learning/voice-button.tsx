'use client'

import { useEffect, useRef } from 'react'
import { Mic, Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import { useT } from '@/lib/i18n/use-translation'
import type { Locale } from '@/lib/i18n/strings'
import type { OptimisticMessage } from '@/types/chat'

interface VoiceButtonProps {
  sessionId: string
  /** Idioma de la sesión — se propaga al TTS para que pronuncie en EN cuando
   * corresponde (sin Spanish accent leakage). Default ES. */
  language?: Locale
  onMessage?: (message: OptimisticMessage) => void
  onStreamStart?: (id: string) => void
  onStreamDelta?: (id: string, delta: string) => void
  onStreamDone?: (id: string) => void
  disabled?: boolean
  autoStart?: boolean // Auto-activate voice on mount (kiosko mode)
}

export function VoiceButton({
  sessionId,
  language = 'ES',
  onMessage,
  onStreamStart,
  onStreamDelta,
  onStreamDone,
  disabled,
  autoStart = false,
}: VoiceButtonProps) {
  const t = useT(language)
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
    language,
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
            {state === 'connecting' ? t('voice_connecting') : t('voice_activate')}
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
        disabled={disabled || (!canStart && !isRecording)}
        variant={isRecording ? 'destructive' : 'default'}
        size="sm"
        className={`gap-1.5 select-none ${isRecording ? 'animate-pulse' : ''}`}
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isRecording
            ? t('voice_click_to_send')
            : isBusy || disabled
              ? t('session_speaking')
              : t('voice_click_to_speak')}
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
          {t('voice_restart')}
        </Button>
      )}
    </div>
  )
}
