'use client'

import { useRef, useState } from 'react'
import { Volume2, Loader2, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlayAudioButtonProps {
  text: string
  className?: string
}

export function PlayAudioButton({ text, className }: PlayAudioButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState('idle')
  }

  const play = async () => {
    if (state === 'playing') {
      stop()
      return
    }

    setState('loading')
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setState('idle')
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setState('idle')
        URL.revokeObjectURL(url)
      }
      await audio.play()
      setState('playing')
    } catch (e) {
      console.error('Play audio error:', e)
      setState('idle')
    }
  }

  return (
    <Button
      type="button"
      onClick={play}
      variant="ghost"
      size="sm"
      className={`h-7 gap-1 text-xs text-gray-500 hover:text-gray-700 ${className ?? ''}`}
    >
      {state === 'loading' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : state === 'playing' ? (
        <Pause className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {state === 'playing' ? 'Pausar' : 'Escuchar'}
    </Button>
  )
}
