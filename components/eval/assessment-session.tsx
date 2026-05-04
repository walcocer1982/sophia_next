'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { TutorMode } from '../learning/tutor-mode'
import type { ChatMessage, OptimisticMessage } from '@/types/chat'
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

  // Generate welcome message on mount
  useEffect(() => {
    if (welcomeRequested.current) return
    welcomeRequested.current = true

    const generate = async () => {
      const welcomeId = `welcome-${Date.now()}`
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

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let content = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
          setMessages(prev => prev.map(m => m.id === welcomeId ? { ...m, content } : m))
        }
        setMessages(prev => prev.map(m =>
          m.id === welcomeId ? { ...m, status: 'completed', isOptimistic: false } : m
        ))
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

  return (
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col">
      {/* Bar with timer */}
      <div className="shrink-0 mb-3 flex items-center justify-between bg-white rounded-lg border px-4 py-2">
        <div className="text-sm">
          <span className="text-gray-500">Participante:</span>{' '}
          <strong>{participantName}</strong>
        </div>
        <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${lowTime ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
          <Clock className="h-5 w-5" />
          {timeLabel}
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
          />
        </ProgressProvider>
      </div>
    </div>
  )
}
