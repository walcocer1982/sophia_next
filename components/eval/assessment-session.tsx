'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogOut, Target, Lightbulb, ImageIcon, Type, X, BarChart3, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SophiaAvatar } from '../learning/sophia-avatar'
import { VoiceButton } from '../learning/voice-button'
import { ChatInput, type ChatInputRef } from '../learning/chat-input'
import { ConversationDrawer } from '../learning/conversation-drawer'
import type { OptimisticMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'
import { useT } from '@/lib/i18n/use-translation'
import type { Locale } from '@/lib/i18n/strings'

// Limpia markdown/listas/headings para que TTS suene natural.
// Mismo criterio que usa la bienvenida: que el audio lea texto plano
// sin asteriscos ni símbolos.
function stripMarkdownForTts(text: string): string {
  return text
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
}

interface FinishedData {
  participantId: string
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
}

interface ClassImage {
  activityId: string
  url: string
  description: string
  showWhen?: 'on_start' | 'on_reference' | 'on_demand'
  order: number
}

interface AssessmentSessionProps {
  sessionId: string
  participantId: string
  participantName: string
  lessonTitle: string
  lessonObjective: string
  keyPoints: string[]
  galleryImages: ClassImage[]
  videoUrl?: string | null
  voiceEnabled?: boolean
  timeLimitMin: number
  /** Idioma de la sesión (ES default). Solo afecta la UI — Sophia decide su
   * idioma de respuesta en el backend leyendo lessonSession.language. */
  language?: Locale
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
  voiceEnabled = true,
  timeLimitMin,
  language = 'ES',
  onFinished,
}: AssessmentSessionProps) {
  const t = useT(language)
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin * 60)
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [welcomeLoading, setWelcomeLoading] = useState(true)
  const [showTextInput, setShowTextInput] = useState(!voiceEnabled)
  const [isMobile, setIsMobile] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [lightboxImage, setLightboxImage] = useState<{ url: string; description: string } | null>(null)
  const [progressData, setProgressData] = useState<{ current: number; total: number; percentage: number; currentActivityId: string | null } | null>(null)
  // Imagen visible AHORA — una sola a la vez, basada en (a) actividad actual
  // y (b) lo que Sophia mencionó recientemente. Si null, no se muestra ninguna.
  const [visibleImageIdx, setVisibleImageIdx] = useState<number>(0)
  const [showHistory, setShowHistory] = useState(false)
  const welcomeRequested = useRef(false)
  const finishedRef = useRef(false)
  const welcomeAudioPlayedRef = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Fetch progress en montaje + cada vez que la conversación cambia (Sophia
  // responde → posible activity_completed → recargar). Polling cada 8s como
  // safety net por si la voz completa una actividad sin que el cliente lo sepa.
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/activity/progress?sessionId=${sessionId}`)
      if (!res.ok) return
      const data = await res.json()
      setProgressData({
        current: data.currentPosition ?? data.progress ?? 0,
        total: data.totalActivities ?? data.total ?? 0,
        percentage: data.percentage ?? 0,
        currentActivityId: data.currentActivityId ?? null,
      })
    } catch {
      // silencio: la barra solo es info, si falla queda en 0%
    }
  }, [sessionId])

  useEffect(() => {
    fetchProgress()
    const interval = setInterval(fetchProgress, 8000)
    return () => clearInterval(interval)
  }, [fetchProgress])

  // Detección de móvil en mount. En móvil la voz es problemática (red celular,
  // autoplay de iOS, echo entre speakers y mic). Por eso: si es móvil, abrimos
  // Escribir por default y mostramos un hint pidiendo usar texto.
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(mobile)
    if (mobile) setShowTextInput(true)
  }, [])

  // Force the Sophia animation to autoplay reliably even if the browser
  // throttles the declarative autoplay attribute.
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [videoUrl])

  // Imágenes de la actividad ACTUAL ordenadas por su `order` original.
  // Si la actividad actual NO tiene imágenes → devolvemos [] (vacío). El render
  // muestra "Sin recursos para esta actividad". NO caemos a las imágenes de
  // otra actividad — eso confundía al estudiante (estaba en Act 3 sin imágenes
  // y veía la imagen de Act 1 reapareciendo).
  // Solo en el caso inicial (sin currentActivityId todavía, antes del primer
  // fetch de progress) usamos la primera actividad que tenga imágenes.
  const activityImages = useMemo(() => {
    const currentId = progressData?.currentActivityId
    if (currentId) {
      return galleryImages
        .filter((img) => img.activityId === currentId)
        .sort((a, b) => a.order - b.order)
    }
    // Estado inicial (sin progressData todavía): primer activityId presente
    const firstActId = galleryImages[0]?.activityId
    return galleryImages
      .filter((img) => img.activityId === firstActId)
      .sort((a, b) => a.order - b.order)
  }, [galleryImages, progressData?.currentActivityId])

  // Cuando cambia la actividad, reseteo a la primera imagen `on_start`
  // (o índice 0 si ninguna lo es).
  useEffect(() => {
    const startIdx = activityImages.findIndex((img) => img.showWhen === 'on_start')
    setVisibleImageIdx(startIdx >= 0 ? startIdx : 0)
  }, [progressData?.currentActivityId, activityImages])

  // La imagen visible: una sola — del set de la actividad actual.
  const visibleImage = activityImages[visibleImageIdx] ?? null

  // Detector de "Sophia mencionó la próxima imagen". Toma palabras significativas
  // (>3 chars, sin stop-words comunes) de la description y cuenta cuántas
  // aparecen en el texto. Si ≥2 matches, considero que la mencionó.
  const STOP_WORDS = useMemo(() => new Set([
    'para', 'como', 'pero', 'esta', 'este', 'esto', 'eso', 'esa', 'ese',
    'los', 'las', 'una', 'unos', 'unas', 'del', 'que', 'con', 'por',
    'sobre', 'hace', 'hacer', 'tiene', 'tener', 'cada', 'todos', 'todas',
  ]), [])

  const textMentionsImage = useCallback((text: string, description: string): boolean => {
    if (!text || !description) return false
    const normalized = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const textNorm = normalized(text)
    const keywords = normalized(description)
      .split(/[\s,;.()→]+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    let matches = 0
    for (const k of keywords) {
      if (textNorm.includes(k)) matches++
      if (matches >= 2) return true
    }
    return false
  }, [STOP_WORDS])

  // Cada vez que el último mensaje de Sophia cambia (streaming o nuevo), miro
  // si menciona alguna imagen NEXT-en-el-orden que tenga showWhen=on_reference.
  // Si sí, avanzo el índice. Una imagen a la vez.

  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  // Avanza a la siguiente imagen cuando Sophia la menciona en su respuesta.
  // Solo mira la última respuesta y solo avanza si la imagen siguiente es
  // on_reference (las on_demand no aparecen solas; las on_start ya están).
  useEffect(() => {
    if (!lastAssistantMessage?.content) return
    if (visibleImageIdx >= activityImages.length - 1) return
    const nextIdx = visibleImageIdx + 1
    const next = activityImages[nextIdx]
    if (!next) return
    if (next.showWhen === 'on_demand') return
    if (textMentionsImage(lastAssistantMessage.content, next.description)) {
      setVisibleImageIdx(nextIdx)
    }
  }, [lastAssistantMessage?.content, activityImages, visibleImageIdx, textMentionsImage])

  // TTS de la respuesta cuando el estudiante escribe (no habla). Antes solo
  // se reproducía audio en el flujo de voz; si el usuario abría Escribir y
  // mandaba texto, Sophia respondía SOLO en texto y se sentía mudo. Ahora
  // también sintetiza voz para que la experiencia sea consistente.
  // Bloquea el input mientras suena (avatarState='speaking') — el ChatInput
  // ya respeta `disabled={avatarState === 'speaking'}`.
  const speakReply = useCallback(async (text: string) => {
    if (!voiceEnabled) return
    const clean = stripMarkdownForTts(text)
    if (!clean) return
    setAvatarState('speaking')
    let objectUrl: string | null = null
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, language }),
      })
      if (!res.ok) {
        setAvatarState('idle')
        return
      }
      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(objectUrl)
      const cleanup = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        setAvatarState('idle')
      }
      audio.onended = cleanup
      audio.onerror = cleanup
      await audio.play().catch(() => cleanup())
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setAvatarState('idle')
    }
  }, [voiceEnabled])

  // Auto-play TTS callback (only when voice is enabled for this course)
  const playWelcomeAudio = useCallback(async (text: string) => {
    if (!voiceEnabled) return
    if (welcomeAudioPlayedRef.current) return
    welcomeAudioPlayedRef.current = true
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
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
  }, [voiceEnabled])

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
            body: JSON.stringify({ text: cleanText, language }),
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

  // NOTA: auto-finalizar al llegar al 100% se removió. El usuario reportó
  // múltiples veces que el timer cortaba antes de que pudiera dar la última
  // respuesta. Ahora la clase termina SOLO cuando:
  //   1. El usuario clickea "Salir" (handleFinishEarly)
  //   2. Se acaba el tiempo límite (secondsLeft <= 0)
  // Esto da control total al estudiante para responder lo que necesite,
  // incluso después de que Sophia diga su cierre.

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
          // Sophia terminó de responder — recargar progreso por si verificó/avanzó actividad
          fetchProgress()
          // Si la voz está habilitada, sintetizá también la respuesta. El usuario
          // escribió por texto pero igual queremos audio para consistencia.
          // speakReply maneja avatarState='speaking' → 'idle' internamente.
          if (voiceEnabled) {
            void speakReply(acc)
          }
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
    if (!confirm(t('session_exit_confirm'))) return
    await finishAssessment()
  }

  // Tiempo restante: lo mostramos informativo (sin presión visual). El visitante
  // sabe cuánto le queda pero no le aparece en rojo parpadeante.
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="h-full w-full max-w-[1600px] mx-auto px-3 py-2 flex flex-col gap-2 overflow-hidden">
      {/* Top bar: participant + timer + finish */}
      <div className="shrink-0 flex items-center justify-between bg-[#0d1f3c]/80 backdrop-blur border border-white/10 rounded-xl px-4 py-2">
        <div className="text-sm text-slate-300">
          <span className="text-slate-500">{t('session_participant')}:</span>{' '}
          <strong className="text-white">{participantName}</strong>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            {timeLabel}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleFinishEarly}
            className="gap-1.5 bg-white/5 border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t('session_exit')}
          </Button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* LEFT: Aprendizajes */}
        <aside className="col-span-3 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl p-3 overflow-hidden flex flex-col gap-3 min-h-0">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 line-clamp-1">{lessonTitle}</h2>

          <section className="shrink-0">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cyan-400/30">
              <Target className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm sm:text-base font-semibold text-white">{t('session_objective_label')}</h3>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{lessonObjective}</p>
          </section>

          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cyan-400/30 shrink-0">
              <Lightbulb className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm sm:text-base font-semibold text-white">{t('session_key_points_label')}</h3>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
              {keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 text-sm sm:text-base">
                  <span className="text-cyan-400 font-semibold shrink-0">{i + 1}.</span>
                  <span className="text-slate-300 leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </section>

          {/* PROGRESO — fijo abajo del sidebar para que el visitante vea su avance */}
          {progressData && progressData.total > 0 && (
            <section className="shrink-0 pt-3 border-t border-white/10">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    <span>{t('session_progress_label')}</span>
                  </div>
                  <span className="text-sm font-semibold text-cyan-400">{progressData.percentage}%</span>
                </div>
                <Progress value={progressData.percentage} className="h-2 bg-white/10" />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  {t('session_activity_of', { current: Math.max(1, progressData.current), total: progressData.total })}
                </p>
              </div>
            </section>
          )}
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
                    <span className="text-sm text-slate-400">{t('session_preparing')}</span>
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
                  <div className="text-sm sm:text-base text-slate-100 leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        hr: () => <hr className="my-2 border-white/10" />,
                        ul: ({ children }) => <ul className="list-disc list-inside my-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside my-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        code: ({ children }) => <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-200 font-mono text-sm">{children}</code>,
                      }}
                    >
                      {lastAssistantMessage.content}
                    </ReactMarkdown>
                    {lastAssistantMessage.status === 'streaming' && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block ml-1 text-cyan-400"
                      >▊</motion.span>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Ver conversación (mismo patrón que /learn — drawer lateral con historial completo) */}
          {messages.length > 0 && (
            <div className="shrink-0 flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t('session_view_conversation')} ({messages.length} {messages.length === 1 ? t('session_message') : t('session_messages')})
              </button>
            </div>
          )}

          {/* Hint para móvil: la voz es problemática en celular (red, autoplay
              de iOS, echo). Sugerimos Escribir antes de que sufran como Pepe. */}
          {isMobile && voiceEnabled && (
            <div className="shrink-0 flex items-center justify-center pt-2">
              <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-400/20 rounded-full px-3 py-1">
                {t('session_writing_hint')}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="shrink-0 mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
            {voiceEnabled && (
              <VoiceButton
                sessionId={sessionId}
                autoStart
                disabled={isLoading || welcomeLoading || avatarState === 'speaking'}
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
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTextInput(v => !v)}
              className="gap-1.5 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">{voiceEnabled ? (showTextInput ? t('session_hide_button') : t('session_write_button')) : t('session_write_button')}</span>
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
                <div className="mt-2">
                  <ChatInput
                    ref={chatInputRef}
                    variant="dark"
                    onSend={handleSendMessage}
                    disabled={isLoading || welcomeLoading || avatarState === 'speaking'}
                    isGeneratingWelcome={welcomeLoading}
                    isThinking={isLoading}
                    isSpeaking={avatarState === 'speaking'}
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
            <h3 className="text-xs font-semibold text-white">{t('session_resources_label')}</h3>
          </div>
          {videoUrl ? (
            <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-0">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-auto block max-h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          ) : !visibleImage ? (
            <p className="text-xs text-slate-500 text-center py-8">{t('session_no_resources')}</p>
          ) : (
            // UNA imagen visible a la vez. Cambia de imagen con animación cuando
            // Sophia avanza a un nuevo concepto que matchee con la descripción
            // de la siguiente imagen (textMentionsImage).
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <AnimatePresence mode="wait">
                <motion.button
                  type="button"
                  key={visibleImage.url}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => setLightboxImage({ url: visibleImage.url, description: visibleImage.description })}
                  className="block w-full text-left rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/40 transition-colors group shrink-0"
                >
                  <div className="relative w-full aspect-video bg-black/30">
                    <Image
                      src={visibleImage.url}
                      alt={visibleImage.description}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  {visibleImage.description && (
                    <p className="text-[10px] text-slate-400 leading-snug p-2 line-clamp-3 group-hover:text-slate-300">
                      {visibleImage.description}
                    </p>
                  )}
                </motion.button>
              </AnimatePresence>
              {activityImages.length > 1 && (
                <p className="text-[10px] text-slate-500 text-center shrink-0">
                  {t('session_image_counter', { current: visibleImageIdx + 1, total: activityImages.length })}
                </p>
              )}
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

      {/* Historial de conversación (mismo componente que /learn) */}
      <ConversationDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        messages={messages}
      />
    </div>
  )
}
