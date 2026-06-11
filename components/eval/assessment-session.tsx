'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogOut, Target, Lightbulb, Type, X, MessageSquare, Maximize2, Info } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SophiaAvatar } from '../learning/sophia-avatar'
import {
  SophiaTalkingHead,
  type TalkingHeadHandle,
} from '../learning/avatar-3d/sophia-talkinghead'
import { featureFlags } from '@/lib/env'
import { VoiceButton } from '../learning/voice-button'
import { ChatInput, type ChatInputRef } from '../learning/chat-input'
import { ConversationDrawer } from '../learning/conversation-drawer'
import type { OptimisticMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'
import { getUnlockedAudio } from '@/lib/audio-unlock'
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
  // --- Avatar 3D experimental (TalkingHead), detrás de feature flag ---
  const use3DAvatar = featureFlags.enable3DAvatar
  const talkingHeadRef = useRef<TalkingHeadHandle>(null)
  // Ref de disponibilidad: lo leemos DENTRO de speakReply para evitar stale
  // closures (el callback de streaming captura una versión vieja de speakReply).
  const avatar3DReadyRef = useRef(false)
  // Diagnóstico solo en consola (sin overlay que tape la UI).
  const pushDebug = useCallback((msg: string) => {
    console.log('[avatar3d:eval]', msg)
  }, [])
  // Salud del pipeline 3D: tras 2 fallos (error del iframe o watchdog vencido)
  // dejamos de enrutar audio por el avatar durante el resto de la sesión y
  // todo suena por el reproductor normal. La voz NUNCA debe quedarse muda por
  // culpa del experimento de lip-sync.
  const avatar3DFailuresRef = useRef(0)
  // ¿Enrutar el audio por el avatar 3D (lip-sync)? Ya no exige "listo": el
  // componente encola el habla y la reproduce al cargar (sirve para el welcome).
  const shouldRoute3D = () =>
    use3DAvatar && !!talkingHeadRef.current && avatar3DFailuresRef.current < 2
  // Resolver del 'speakEnd'/'error' actual: lo usa el modo voz para serializar
  // oraciones (cada una espera a que el avatar la termine antes de la siguiente).
  const speakEndResolverRef = useRef<((result: 'end' | 'error') => void) | null>(null)

  // Duración estimada del habla (texto → ms) para los watchdogs. Generosa:
  // ~450ms por palabra + 4s de margen, tope 30s.
  const estimateSpeechMs = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return Math.min(30000, 4000 + words * 450)
  }

  // Reproduce el blob por el <audio> compartido (desbloqueado en el gesto de
  // registro — un new Audio() perdería ese desbloqueo).
  const playBlobFallback = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const audio = getUnlockedAudio() ?? new Audio()
    audio.src = url
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      audio.play().catch(() => resolve())
    })
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }, [])

  // Reproduce una oración del modo voz por el avatar 3D (lip-sync) y resuelve
  // cuando el avatar termina de hablarla. Endurecido:
  //  - watchdog adaptativo a la longitud del texto (antes 30s fijos — una
  //    oración perdida congelaba toda la cola medio minuto)
  //  - error del iframe (p. ej. decode fallido) → la oración se reproduce por
  //    el audio normal para que no haya silencio
  //  - 2 fallos seguidos → el resto de la sesión va por audio normal
  const speakChunkVia3D = useCallback(async (blob: Blob, text: string) => {
    if (!shouldRoute3D()) {
      await playBlobFallback(blob)
      return
    }
    const buf = await blob.arrayBuffer()
    const result = await new Promise<'end' | 'error' | 'timeout'>((resolve) => {
      const safety = setTimeout(() => {
        speakEndResolverRef.current = null
        resolve('timeout')
      }, estimateSpeechMs(text))
      speakEndResolverRef.current = (r) => { clearTimeout(safety); resolve(r) }
      talkingHeadRef.current!.speakAudio(buf, text)
    })
    if (result === 'end') {
      avatar3DFailuresRef.current = 0
      return
    }
    avatar3DFailuresRef.current += 1
    pushDebug(`3D ${result} (fallo ${avatar3DFailuresRef.current}/2) — degradando a audio normal`)
    // Error = el audio NO sonó (decode fallido) → reproducirlo por el camino
    // normal. Timeout = ambiguo (pudo sonar y perderse el marker): no se
    // re-reproduce para no duplicar la oración, solo cuenta como fallo.
    if (result === 'error') {
      await playBlobFallback(blob)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [use3DAvatar, playBlobFallback, pushDebug])
  const [lightboxImage, setLightboxImage] = useState<{ url: string; description: string } | null>(null)
  // Popover del objetivo (ⓘ del sidebar) — el goal ya no está fijo en pantalla.
  const [showGoal, setShowGoal] = useState(false)
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

  // ¿La imagen está "activa" (en uso por la conversación)? Gobierna el héroe
  // dinámico del centro: el saludo y las actividades sin imagen son de Sophia
  // (grande); cuando Sophia usa la imagen, esta toma el centro y Sophia se
  // encoge. Transición de UNA vía por actividad — sin rebotes turno a turno.
  const [heroIsImage, setHeroIsImage] = useState(false)
  const hasUserMessage = useMemo(() => messages.some((m) => m.role === 'user'), [messages])

  // Cuando cambia la actividad, reseteo a la primera imagen `on_start`
  // (o índice 0 si ninguna lo es) y recalculo el héroe: on_start toma el
  // centro al entrar a la actividad — pero nunca durante el saludo (antes
  // del primer mensaje del estudiante la pantalla es de Sophia).
  useEffect(() => {
    const startIdx = activityImages.findIndex((img) => img.showWhen === 'on_start')
    setVisibleImageIdx(startIdx >= 0 ? startIdx : 0)
    setHeroIsImage(hasUserMessage && startIdx >= 0)
  }, [progressData?.currentActivityId, activityImages, hasUserMessage])

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

  // Activación del héroe por mención: si Sophia referencia la imagen visible
  // en su última respuesta, la imagen toma el centro (cubre on_reference y el
  // recovery, donde Sophia repite su último mensaje). on_demand nunca solo.
  useEffect(() => {
    if (heroIsImage) return
    // Nunca durante el saludo: el welcome SIEMPRE presenta el tema de la
    // lección, así que matchea la descripción de la imagen por afinidad
    // natural (falso positivo sistemático del matcher difuso).
    if (!hasUserMessage) return
    const content = lastAssistantMessage?.content
    const img = activityImages[visibleImageIdx]
    if (!content || !img || img.showWhen === 'on_demand') return
    if (textMentionsImage(content, img.description)) setHeroIsImage(true)
  }, [lastAssistantMessage?.content, activityImages, visibleImageIdx, heroIsImage, hasUserMessage, textMentionsImage])

  // Key points "encendidos": una vez que Sophia menciona un punto clave en
  // alguna respuesta, queda iluminado en el sidebar por el resto de la sesión.
  // Reusa el mismo matcher difuso que las imágenes (≥2 keywords presentes).
  const [litKeyPoints, setLitKeyPoints] = useState<Set<number>>(new Set())
  useEffect(() => {
    const content = lastAssistantMessage?.content
    if (!content) return
    setLitKeyPoints((prev) => {
      let changed = false
      const next = new Set(prev)
      keyPoints.forEach((point, i) => {
        if (!next.has(i) && textMentionsImage(content, point)) {
          next.add(i)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [lastAssistantMessage?.content, keyPoints, textMentionsImage])

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
    pushDebug(`speakReply entró (voiceEnabled=${voiceEnabled})`)
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
      const route3D = shouldRoute3D()
      pushDebug(`speakReply: ruta=${route3D ? '3D iframe' : 'audio padre'} ready=${avatar3DReadyRef.current} bytes=${blob.size}`)
      // Avatar 3D activo: el iframe reproduce el audio y hace lip-sync.
      // El retorno a 'idle' lo dispara onSpeakEnd (marker al final del audio).
      if (route3D) {
        const buf = await blob.arrayBuffer()
        talkingHeadRef.current!.speakAudio(buf, clean)
        // Watchdog: si el 'speakEnd' del iframe se pierde, liberar el input
        // igual (antes quedaba "Sophia está hablando..." indefinidamente).
        setTimeout(() => {
          setAvatarState((s) => (s === 'speaking' ? 'idle' : s))
        }, estimateSpeechMs(clean))
        return
      }
      objectUrl = URL.createObjectURL(blob)
      const audio = getUnlockedAudio() ?? new Audio()
      audio.src = objectUrl
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
      if (shouldRoute3D()) {
        const buf = await blob.arrayBuffer()
        talkingHeadRef.current!.speakAudio(buf, text)
        return
      }
      const url = URL.createObjectURL(blob)
      const audio = getUnlockedAudio() ?? new Audio()
      audio.src = url
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(e => console.warn('Welcome audio autoplay blocked:', e))
    } catch (e) {
      console.warn('TTS welcome failed:', e)
    }
  }, [voiceEnabled])

  // Cargar mensajes existentes (caso recovery) o generar welcome (sesión nueva)
  useEffect(() => {
    if (welcomeRequested.current) return
    welcomeRequested.current = true

    const initSession = async () => {
      // Primero chequeamos si la sesión ya tiene mensajes (recovery)
      try {
        const histRes = await fetch(`/api/session/${sessionId}/messages`)
        if (histRes.ok) {
          const histData = await histRes.json() as { messages: Array<{
            id: string; role: string; content: string; timestamp: string
          }> }
          if (histData.messages && histData.messages.length > 0) {
            // Sesión recuperada — cargar historial y NO generar welcome
            setMessages(histData.messages.map((m) => ({
              id: m.id,
              sessionId,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.timestamp),
              status: 'completed' as const,
              isOptimistic: false,
            })))
            welcomeAudioPlayedRef.current = true // evitar TTS del welcome
            setWelcomeLoading(false)
            // Sesión recuperada: repetir en voz el último mensaje de Sophia
            // para que el participante retome el hilo. Antes la recuperación
            // era siempre muda (el "welcome ya reproducido" silenciaba todo).
            const lastAssistant = [...histData.messages].reverse().find((m) => m.role === 'assistant')
            if (lastAssistant?.content && voiceEnabled) {
              void speakReply(lastAssistant.content)
            }
            return
          }
        }
      } catch {
        // Si falla, seguimos con el flujo normal de welcome
      }

      // Sesión nueva — generar welcome
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
            welcomeAudioPlayedRef.current = true
            // Avatar 3D: enrutar el welcome por el iframe para que haga lip-sync.
            // Si aún no está listo, el componente lo encola y lo reproduce al cargar.
            if (shouldRoute3D()) {
              setMessages(prev => prev.map(m =>
                m.id === welcomeId ? { ...m, content: fullContent, status: 'completed', isOptimistic: false } : m
              ))
              pushDebug(`welcome -> 3D iframe bytes=${blob.size}`)
              const buf = await blob.arrayBuffer()
              talkingHeadRef.current!.speakAudio(buf, cleanText)
            } else {
              const url = URL.createObjectURL(blob)
              const audio = getUnlockedAudio() ?? new Audio()
              audio.preload = 'auto'
              audio.src = url
              audio.onended = () => URL.revokeObjectURL(url)
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
            }
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
    initSession()
  }, [sessionId, playWelcomeAudio, speakReply, voiceEnabled])

  useEffect(() => {
    if (secondsLeft <= 0) {
      finishAssessment()
      return
    }
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  // Cierre automático SOLO al 100%: cuando todas las actividades están
  // completas y Sophia terminó su mensaje de despedida (texto y voz), la
  // evaluación aparece sola tras un margen para leer/escuchar el cierre.
  // (La encuesta NPS se encadena 1.5s después, ya dentro de AssessmentResult.)
  // Los visitantes de feria casi nunca presionan "Salir" y se iban sin ver
  // su resultado. OJO: esto NO es el viejo auto-finish que cortaba al
  // estudiante a mitad de respuesta — solo dispara con la lección terminada,
  // y si envía otro mensaje (isLoading) el timer se cancela y reinicia.
  const AUTO_FINISH_DELAY_MS = 6000
  useEffect(() => {
    if (!progressData || progressData.total === 0 || progressData.percentage < 100) return
    if (isLoading || welcomeLoading) return
    if (avatarState === 'speaking') return
    if (lastAssistantMessage?.status === 'streaming') return
    const timer = setTimeout(() => { void finishAssessment() }, AUTO_FINISH_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressData?.percentage, progressData?.total, isLoading, welcomeLoading, avatarState, lastAssistantMessage?.status])

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

  // ¿La imagen tiene el centro AHORA? (activa + existe para esta actividad)
  const showImageHero = heroIsImage && !!visibleImage

  return (
    <div className="h-full w-full max-w-[1600px] mx-auto px-3 py-2 flex flex-col gap-2 overflow-hidden">
      {/* Top bar: participante + progreso + timer etiquetado + salir discreto */}
      <div className="shrink-0 flex items-center justify-between gap-4 bg-[#0d1f3c]/80 backdrop-blur border border-white/10 rounded-xl px-4 py-2">
        <div className="text-sm text-slate-300 shrink-0">
          <span className="text-slate-500">{t('session_participant')}:</span>{' '}
          <strong className="text-white">{participantName}</strong>
        </div>

        {/* Progreso visible donde el ojo pasa siempre — antes estaba enterrado
            en la esquina inferior izquierda */}
        {progressData && progressData.total > 0 && (
          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-sm">
            <Progress value={progressData.percentage} className="h-2 bg-white/10 flex-1" />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {t('session_activity_of', { current: Math.max(1, progressData.current), total: progressData.total })}
              {' · '}<span className="text-cyan-400 font-semibold">{progressData.percentage}%</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs text-slate-500">{language === 'EN' ? 'Time left' : 'Tiempo restante'}</span>
            <span className="font-mono">{timeLabel}</span>
          </div>
          {/* Salir: acción destructiva → visual discreto, lejos de parecer CTA */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleFinishEarly}
            className="gap-1.5 text-slate-500 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            {t('session_exit')}
          </Button>
        </div>
      </div>

      {/* 2 columnas: guía compacta (3) + escenario principal (9) */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* LEFT: Aprendizajes */}
        <aside className="col-span-3 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl p-3 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Título + objetivo bajo demanda (ⓘ). El goal salió de la vista
              fija: repetía los key points y Sophia lo verbaliza en el saludo.
              Popover por clic (no hover) — el kiosko es pantalla táctil. */}
          <div className="shrink-0 relative flex items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 line-clamp-1">{lessonTitle}</h2>
            <button
              type="button"
              onClick={() => setShowGoal((v) => !v)}
              className={`shrink-0 transition-colors ${showGoal ? 'text-cyan-300' : 'text-slate-500 hover:text-cyan-300'}`}
              title={t('session_objective_label')}
            >
              <Info className="h-4 w-4" />
            </button>
            {showGoal && (
              <div className="absolute top-6 left-0 right-0 z-20 bg-[#0d1f3c] border border-cyan-400/30 rounded-lg p-3 shadow-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-3.5 w-3.5 text-cyan-400" />
                  <p className="text-xs font-semibold text-cyan-300">{t('session_objective_label')}</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{lessonObjective}</p>
              </div>
            )}
          </div>

          {/* Sophia — posición y tamaño FIJOS: la instructora al lado de la
              pizarra. Vive aquí en ambos modos del centro, así no hay layout
              shift y el motor 3D no se recarga nunca. */}
          <div className="shrink-0 flex justify-center">
            {use3DAvatar ? (
              <SophiaTalkingHead
                ref={talkingHeadRef}
                width={220}
                height={260}
                onReady={() => {
                  avatar3DReadyRef.current = true
                  pushDebug('iframe READY (ref=true)')
                }}
                onSpeakEnd={() => {
                  setAvatarState('idle')
                  const r = speakEndResolverRef.current
                  speakEndResolverRef.current = null
                  r?.('end')
                }}
                onError={() => {
                  setAvatarState('idle')
                  const r = speakEndResolverRef.current
                  speakEndResolverRef.current = null
                  r?.('error')
                }}
                onInfo={pushDebug}
              />
            ) : videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-56 rounded-lg object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <SophiaAvatar state={avatarState} size={140} />
            )}
          </div>

          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cyan-400/30 shrink-0">
              <Lightbulb className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">{t('session_key_points_label')}</h3>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
              {/* Cada punto se "enciende" cuando Sophia lo toca en la conversación
                  — convierte la lista estática en un mapa de avance visual. */}
              {keyPoints.map((point, i) => {
                const lit = litKeyPoints.has(i)
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm rounded-md px-1.5 py-1 -mx-1.5 transition-colors duration-500 ${lit ? 'bg-cyan-400/10' : ''}`}
                  >
                    <span className={`font-semibold shrink-0 ${lit ? 'text-cyan-300' : 'text-slate-600'}`}>{i + 1}.</span>
                    <span className={`leading-relaxed ${lit ? 'text-slate-100' : 'text-slate-400'}`}>{point}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>

        {/* MAIN: el material didáctico es el protagonista; el avatar acompaña
            abajo junto a la burbuja. Antes era al revés: el avatar dominaba
            el centro y el diagrama quedaba como thumbnail en una esquina. */}
        <main className="col-span-9 bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl flex flex-col p-3 min-h-0 relative">
          {/* HERO dinámico: la imagen ocupa el centro SOLO cuando la
              conversación la está usando; si no, ese espacio es de Sophia. */}
          {showImageHero && visibleImage ? (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              <AnimatePresence mode="wait">
                <motion.button
                  type="button"
                  key={visibleImage.url}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => setLightboxImage({ url: visibleImage.url, description: visibleImage.description })}
                  className="relative flex-1 min-h-0 w-full rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/40 transition-colors group"
                >
                  <Image
                    src={visibleImage.url}
                    alt={visibleImage.description}
                    fill
                    sizes="(max-width: 768px) 100vw, 70vw"
                    className="object-contain bg-black/30"
                  />
                  {/* Affordance de ampliar — antes la imagen era clickeable sin avisarlo */}
                  <span className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-slate-200 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </motion.button>
              </AnimatePresence>
              <div className="shrink-0 flex items-center justify-between gap-3">
                {visibleImage.description ? (
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 flex-1">{visibleImage.description}</p>
                ) : <span />}
                {activityImages.length > 1 && (
                  <p className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                    {t('session_image_counter', { current: visibleImageIdx + 1, total: activityImages.length })}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Conversación. Con imagen activa, la burbuja va abajo a todo lo
              ancho; sin imagen activa (saludo, actividad sin recursos), la
              burbuja ES la protagonista del centro. Sophia vive fija en la
              columna izquierda — aquí solo está el contenido. */}
          <div className={showImageHero ? 'shrink-0 mt-2' : 'flex-1 min-h-0 flex items-center justify-center'}>
            <div className={showImageHero ? 'w-full' : 'w-full max-w-3xl'}>
              <AnimatePresence mode="wait">
                {welcomeLoading && !lastAssistantMessage?.content ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4"
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
                    className={`w-full bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-y-auto ${showImageHero ? 'p-4 max-h-[32vh]' : 'p-6 max-h-[55vh]'}`}
                  >
                    <div className={`text-slate-100 leading-relaxed ${showImageHero ? 'text-base sm:text-lg' : 'text-lg'}`}>
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

          {/* Controls: UNA acción primaria (voz) + escribir como secundaria */}
          <div className="shrink-0 mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-3">
            {voiceEnabled && (
              <VoiceButton
                sessionId={sessionId}
                language={language}
                autoStart
                prominent
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
                onSpeakChunk={use3DAvatar ? speakChunkVia3D : undefined}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTextInput(v => !v)}
              className="gap-1.5 text-slate-400 hover:text-white hover:bg-white/10"
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
