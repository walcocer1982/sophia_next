'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TutorMode } from '../learning/tutor-mode'
import type { OptimisticMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'
import { ProgressProvider } from '../learning/progress-context'

interface FinishedData {
  participantId: string
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
}

interface AssessmentSessionProps {
  sessionId: string
  participantId: string
  participantName: string
  lessonTitle: string
  timeLimitMin: number
  onFinished: (data: FinishedData) => void
}

export function AssessmentSession({
  sessionId,
  participantId,
  participantName,
  lessonTitle,
  timeLimitMin,
  onFinished,
}: AssessmentSessionProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin * 60)
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [welcomeLoading, setWelcomeLoading] = useState(true)
  const welcomeRequested = useRef(false)
  const finishedRef = useRef(false)
  const welcomeAudioPlayedRef = useRef(false)

  // Auto-play TTS of a quick greeting so Sophia "speaks" immediately
  const playWelcomeAudio = useCallback(async (text: string) => {
    if (welcomeAudioPlayedRef.current) return
    welcomeAudioPlayedRef.current = true
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play().catch(e => console.warn('Welcome audio autoplay blocked:', e))
      audio.onended = () => URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('TTS welcome failed:', e)
    }
  }, [])


  // Generate welcome message on mount
  // Strategy: collect FULL text + prepare audio in parallel, then reveal both at once
  useEffect(() => {
    if (welcomeRequested.current) return
    welcomeRequested.current = true

    const generate = async () => {
      const welcomeId = `welcome-${Date.now()}`

      // Show empty placeholder (skeleton/loader) — text NOT yet visible
      setMessages([{
        id: welcomeId,
        sessionId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        status: 'streaming',
        isOptimistic: true,
        isWelcome: true,
      }])

      try {
        const res = await fetch('/api/chat/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (!res.ok || !res.body) throw new Error('No se pudo generar el mensaje de bienvenida')

        // Collect full text without showing it yet
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += decoder.decode(value, { stream: true })
        }

        if (fullContent.trim().length === 0) {
          setWelcomeLoading(false)
          return
        }

        // Clean markdown for TTS
        const cleanText = fullContent
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/__([^_]+)__/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          .replace(/^\s*[\d]+[.\)]\s*/gm, '')
          .replace(/^\s*[-*•]\s+/gm, '')
          .replace(/\n{2,}/g, '. ')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\s+\./g, '.')
          .replace(/\.+/g, '.')
          .trim()

        // Fetch audio FIRST, before revealing text
        try {
          const ttsRes = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
          })
          if (ttsRes.ok) {
            const blob = await ttsRes.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio()
            audio.preload = 'auto'
            audio.src = url
            audio.onended = () => URL.revokeObjectURL(url)
            welcomeAudioPlayedRef.current = true
            // Wait until audio is fully buffered before playing to avoid cut-off start
            await new Promise<void>((resolve) => {
              audio.oncanplaythrough = () => resolve()
              audio.onerror = () => resolve()
              audio.load()
              // Safety timeout in case event doesn't fire
              setTimeout(() => resolve(), 1500)
            })
            // Reveal text and start audio AT THE SAME TIME
            setMessages(prev => prev.map(m =>
              m.id === welcomeId ? { ...m, content: fullContent, status: 'completed', isOptimistic: false } : m
            ))
            audio.play().catch(e => console.warn('Welcome audio autoplay blocked:', e))
          } else {
            // TTS failed — just show text
            setMessages(prev => prev.map(m =>
              m.id === welcomeId ? { ...m, content: fullContent, status: 'completed', isOptimistic: false } : m
            ))
          }
        } catch {
          setMessages(prev => prev.map(m =>
            m.id === welcomeId ? { ...m, content: fullContent, status: 'completed', isOptimistic: false } : m
          ))
        }
      } catch {
        // ignore — user can still interact
      } finally {
        setWelcomeLoading(false)
      }
    }
    generate()
  }, [sessionId])

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      finishAssessment()
      return
    }
    const t = setInterval(() => {
      setSecondsLeft(s => s - 1)
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const finishAssessment = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    try {
      const res = await fetch(`/api/eval/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        onFinished({
          participantId,
          grade: data.grade,
          gradeOver20: data.gradeOver20,
          passed: data.passed,
          participantName,
        })
      } else {
        // If finish failed, still show result with what we have
        onFinished({
          participantId,
          grade: 0,
          gradeOver20: 0,
          passed: false,
          participantName,
        })
      }
    } catch {
      onFinished({
        participantId,
        grade: 0,
        gradeOver20: 0,
        passed: false,
        participantName,
      })
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return
    setIsLoading(true)

    const userMessage: OptimisticMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
      status: 'completed',
      isOptimistic: false,
    }
    const assistantId = `asst-${Date.now()}`
    const assistantPlaceholder: OptimisticMessage = {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
    }
    setMessages(prev => [...prev, userMessage, assistantPlaceholder])

    try {
      let acc = ''
      await streamChatResponse(
        sessionId,
        content,
        (chunk) => {
          acc += chunk
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m))
        },
        () => {
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, status: 'completed', isOptimistic: false } : m
          ))
        },
        () => {
          setMessages(prev => prev.filter(m => m.id !== assistantId))
        }
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setIsLoading(false)
    }
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const lowTime = secondsLeft <= 60

  const handleFinishEarly = async () => {
    if (!confirm('¿Estás seguro de que quieres terminar la evaluación ahora? No podrás continuar después.')) return
    await finishAssessment()
  }

  return (
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col">
      {/* Bar with timer */}
      <div className="shrink-0 mb-3 flex items-center justify-between bg-white rounded-lg border px-4 py-2">
        <div className="text-sm">
          <span className="text-gray-500">Participante:</span>{' '}
          <strong>{participantName}</strong>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${lowTime ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
            <Clock className="h-5 w-5" />
            {timeLabel}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleFinishEarly}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Terminar
          </Button>
        </div>
      </div>

      {/* Tutor */}
      <div className="flex-1 bg-white rounded-lg border overflow-hidden">
        <ProgressProvider sessionId={sessionId} initialProgress={undefined}>
          <TutorMode
            sessionId={sessionId}
            lessonTitle={lessonTitle}
            messages={messages}
            onAddMessage={(m) => setMessages(prev => [...prev, m])}
            onUpdateMessage={(id, updater) =>
              setMessages(prev => prev.map(m => m.id === id ? updater(m) : m))
            }
            onSendText={handleSendMessage}
            isLoading={isLoading}
            isGeneratingWelcome={welcomeLoading}
            autoStartVoice
          />
        </ProgressProvider>
      </div>
    </div>
  )
}
