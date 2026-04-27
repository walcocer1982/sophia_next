'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import type { OptimisticMessage } from '@/types/chat'

interface VoiceButtonProps {
  sessionId: string
  onMessage?: (message: OptimisticMessage) => void
  disabled?: boolean
}

export function VoiceButton({ sessionId, onMessage, disabled }: VoiceButtonProps) {
  const { state, error, isActive, start, stop } = useVoiceChat({
    sessionId,
    onTranscript: (t) => {
      onMessage?.({
        id: `voice-${Date.now()}-${t.role}`,
        sessionId,
        role: t.role,
        content: t.content,
        createdAt: new Date(),
        status: 'completed',
        isOptimistic: false,
      })
    },
  })

  const handleClick = () => {
    if (isActive) {
      stop()
    } else {
      start()
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'connecting': return 'Conectando...'
      case 'listening': return 'Escuchando...'
      case 'speaking': return 'Sophia habla...'
      case 'error': return 'Error'
      default: return 'Hablar con Sophia'
    }
  }

  const getIcon = () => {
    if (state === 'connecting') return <Loader2 className="h-4 w-4 animate-spin" />
    if (isActive) return <MicOff className="h-4 w-4" />
    return <Mic className="h-4 w-4" />
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === 'connecting'}
        variant={isActive ? 'destructive' : 'outline'}
        size="sm"
        className={`gap-1.5 ${state === 'listening' ? 'animate-pulse' : ''}`}
        title={getLabel()}
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
      </Button>
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  )
}
