'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogOut, Target, Lightbulb, ImageIcon, Type, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SophiaAvatar } from '../learning/sophia-avatar'
import { VoiceButton } from '../learning/voice-button'
import { ChatInput, type ChatInputRef } from '../learning/chat-input'
import type { OptimisticMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'

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
  lessonObjective: string
  keyPoints: string[]
  galleryImages: { url: string; description: string }[]
  videoUrl?: string | null
  timeLimitMin: number
  onFinished: (data: FinishedData) => void
}

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

export function AssessmentSession({
  sessionId,
  participantId,
  participantName,
  lessonTitle,
  lessonObjective,
  keyPoints,
  galleryImages,
  videoUrl,
  timeLimitMin,
  onFinished,
}: AssessmentSessionProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin * 60)
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [welcomeLoading, setWelcomeLoading] = useState(true)
  const [showTextInput, setShowTextInput] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [lightboxImage, setLightboxImage] = useState<{ url: string; description: string } | null>(null)
  const welcomeRequested = useRef(false)
  const finishedRef = useRef(false)
  const welcomeAudioPlayedRef = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)

  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  // Auto-play TTS callback
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

  // Generate welcome
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
        if (!res.ok || !res.body) throw new Error('No se pudo generar la bienvenida')

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
            await new Promise<void>((resolve) => {
              audio.oncanplaythrough = () => resolve()
              audio.onerror = () => resolve()
              audio.load()
              setTimeout(() => resolve(), 1500)
            })
            setMessages(prev => prev.map(m =>
              m.id === welcomeId ? { ...m, content: fullContent, status: 'completed', isOptimistic: false } : m
            ))
            audio.play().catch(e => console.warn('Welcome audio blocked:', e))
          } else {
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
        // ignore
      } finally {
        setWelcomeLoading(false)
      }
    }
    generate()
  }, [sessionId, playWelcomeAudio])

  useEffect(() => {
    if (secondsLeft <= 0) {
      finishAssessment()
      return
    }
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000)
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
        onFinished({ participantId, grade: 0, gradeOver20: 0, passed: false, participantName })
      }
    } catch {
      onFinished({ participantId, grade: 0, gradeOver20: 0, passed: false, participantName })
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
    setMessages(prev => [...prev, userMessage, {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
    }])
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
        () => setMessages(prev => prev.filter(m => m.id !== assistantId))
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishEarly = async () => {
    if (!confirm('¿Estás seguro de terminar la evaluación ahora?')) return
    await finishAssessment()
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const lowTime = secondsLeft <= 60

  return (
    <div className="h-[calc(100vh-64px)] w-full max-w-[1600px] mx-auto px-3 py-2 flex flex-col gap-2 overflow-hidden">
      {/* Top bar: participant + timer + finish */}
      <div className="shrink-0 flex items-center justify-between bg-[#0d1f3c]/80 backdrop-blur border border-white/10 rounded-xl px-4 py-2">
        <div className="text-sm text-slate-300">
          <span className="text-slate-500">Participante:</span>{' '}
          <strong className="text-white">{participantName}</strong>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${lowTime ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
            <Clock className="h-5 w-5" />
            {timeLabel}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleFinishEarly}
            className="gap-1.5 bg-red-500/10 border-red-400/30 text-red-300 hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Terminar
          </Button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* LEFT: Aprendizajes */}
        <aside className="col-span-3 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl p-3 overflow-hidden flex flex-col gap-3 min-h-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 line-clamp-1">{lessonTitle}</h2>

          <section className="shrink-0">
            <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-cyan-400/30">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white">Aprendizaje Esperado</h3>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{lessonObjective}</p>
          </section>

          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-cyan-400/30 shrink-0">
              <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white">Puntos Clave</h3>
            </div>
            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-cyan-400 font-semibold shrink-0">{i + 1}.</span>
                  <span className="text-slate-300 leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* CENTER: Avatar + bubble */}
        <main className="col-span-6 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl flex flex-col p-3 min-h-0 relative">
          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
            {/* Avatar */}
            <SophiaAvatar state={avatarState} size={170} />

            {/* Bubble or loader */}
            <AnimatePresence mode="wait">
              {welcomeLoading && !lastAssistantMessage?.content ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-xl bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                          className="block w-2 h-2 rounded-full bg-cyan-400"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-400">Sophia se está preparando...</span>
                  </div>
                </motion.div>
              ) : lastAssistantMessage?.content ? (
                <motion.div
                  key={lastAssistantMessage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-2xl bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 max-h-[40vh] overflow-y-auto"
                >
                  <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                    {lastAssistantMessage.content}
                    {lastAssistantMessage.status === 'streaming' && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block ml-1 text-cyan-400"
                      >▊</motion.span>
                    )}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="shrink-0 mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
            <VoiceButton
              sessionId={sessionId}
              autoStart
              disabled={isLoading || welcomeLoading}
              onMessage={(m) => setMessages(prev => [...prev, m])}
              onStreamStart={(id) => {
                setAvatarState('speaking')
                setMessages(prev => [...prev, {
                  id, sessionId, role: 'assistant', content: '',
                  createdAt: new Date(), status: 'streaming', isOptimistic: true,
                }])
              }}
              onStreamDelta={(id, delta) => {
                setMessages(prev => prev.map(m => m.id === id ? { ...m, content: m.content + delta } : m))
              }}
              onStreamDone={(id) => {
                setAvatarState('idle')
                setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'completed', isOptimistic: false } : m))
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTextInput(v => !v)}
              className="gap-1.5 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">{showTextInput ? 'Ocultar' : 'Escribir'}</span>
            </Button>
          </div>

          {/* Text input collapsible */}
          <AnimatePresence>
            {showTextInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="shrink-0 overflow-hidden"
              >
                <div className="mt-2 [&_textarea]:bg-white/5 [&_textarea]:text-white [&_textarea]:border-white/10">
                  <ChatInput
                    ref={chatInputRef}
                    onSend={handleSendMessage}
                    disabled={isLoading || welcomeLoading}
                    isGeneratingWelcome={welcomeLoading}
                    isThinking={isLoading}
                    isStreaming={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT: Sophia animated video (replaces image gallery) */}
        <aside className="col-span-3 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl p-3 overflow-hidden flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2 pb-1.5 border-b border-cyan-400/30 shrink-0">
            <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white">Sophia</h3>
          </div>
          {videoUrl ? (
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          ) : galleryImages.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Sin recursos para esta lección</p>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
              {galleryImages.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setLightboxImage(img)}
                  className="block w-full text-left rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/40 transition-colors group"
                >
                  <div className="relative w-full aspect-video bg-black/30">
                    <Image
                      src={img.url}
                      alt={img.description}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  {img.description && (
                    <p className="text-[10px] text-slate-400 leading-snug p-2 line-clamp-2 group-hover:text-slate-300">
                      {img.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute top-4 right-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[85vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ height: '70vh' }}>
                <Image
                  src={lightboxImage.url}
                  alt={lightboxImage.description}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </div>
              {lightboxImage.description && (
                <div className="mt-3 bg-[#0d1f3c]/90 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-200 leading-relaxed">{lightboxImage.description}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
