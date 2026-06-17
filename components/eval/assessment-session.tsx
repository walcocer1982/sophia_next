'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogOut, Target, Type, X, Maximize2, Info, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { SophiaAvatar } from '../learning/sophia-avatar'
import {
  SophiaTalkingHead,
  type TalkingHeadHandle,
} from '../learning/avatar-3d/sophia-talkinghead'
import { featureFlags } from '@/lib/env'
import { VoiceButton } from '../learning/voice-button'
import { ChatInput, type ChatInputRef } from '../learning/chat-input'
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
  // Lightbox como galería navegable: índice sobre galleryList (todas las
  // imágenes de la clase). null = cerrado.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  // Popover del objetivo (ⓘ de la barra) — el goal no ocupa espacio fijo.
  // Se auto-muestra al inicio por unos segundos para que todos lo lean, y
  // luego se oculta solo; la ⓘ queda para volver a consultarlo.
  const [showGoal, setShowGoal] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setShowGoal(false), 6000)
    return () => clearTimeout(timer)
  }, [])
  const [progressData, setProgressData] = useState<{ current: number; total: number; percentage: number; currentActivityId: string | null } | null>(null)
  const welcomeRequested = useRef(false)
  const finishedRef = useRef(false)
  const welcomeAudioPlayedRef = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Contenedor scrolleable del chat — para auto-bajar al fondo en cada mensaje
  // nuevo o mientras Sophia streamea (antes el último turno quedaba cortado).
  const msgsRef = useRef<HTMLDivElement>(null)

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

  // Último mensaje de Sophia (para resolver imagen, auto-scroll, cierre, etc.)
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])
  const hasUserMessage = useMemo(() => messages.some((m) => m.role === 'user'), [messages])

  // Galería GLOBAL de la clase (todas las imágenes, deduplicadas por url, en
  // orden de la lección). Alimenta el botón "📷 Imágenes (N)", el lightbox y la
  // resolución de la imagen inline. GLOBAL — no por actividad: una referencia
  // de Sophia puede apuntar a una imagen de una actividad anterior (era la
  // causa de mostrar la imagen equivocada).
  const galleryList = useMemo(() => {
    const seen = new Set<string>()
    const out: ClassImage[] = []
    for (const g of galleryImages) {
      if (g.url && !seen.has(g.url)) { seen.add(g.url); out.push(g) }
    }
    return out
  }, [galleryImages])
  const galleryIndexOf = (url: string) => {
    const i = galleryList.findIndex((g) => g.url === url)
    return i < 0 ? 0 : i
  }
  const navLightbox = (d: number) =>
    setLightboxIndex((idx) => (idx === null ? null : (idx + d + galleryList.length) % galleryList.length))

  // Palabras genéricas que NO distinguen una imagen de otra (incluye términos
  // de minería y meta-palabras como "imagen/diagrama" que están en muchas descs).
  const STOP_WORDS = useMemo(() => new Set([
    'para', 'como', 'pero', 'esta', 'este', 'esto', 'eso', 'esa', 'ese',
    'los', 'las', 'una', 'unos', 'unas', 'del', 'que', 'con', 'por',
    'sobre', 'hace', 'hacer', 'tiene', 'tener', 'cada', 'todos', 'todas',
    'imagen', 'imagenes', 'foto', 'diagrama', 'figura', 'panel', 'muestra',
    'donde', 'aqui', 'tunel', 'mina', 'mineria', 'minado',
  ]), [])

  // Cuenta cuántas palabras DISTINTIVAS de la descripción aparecen en el texto.
  // Solo palabras largas (>4) y no genéricas → evita falsos positivos por
  // términos comunes de minería que comparten varias descripciones.
  const scoreMatch = useCallback((text: string, description: string): number => {
    if (!text || !description) return 0
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const textNorm = norm(text)
    const kws = norm(description).split(/[\s,;.()\-→]+/).filter((w) => w.length > 4 && !STOP_WORDS.has(w))
    let score = 0
    const seen = new Set<string>()
    for (const k of kws) {
      if (!seen.has(k) && textNorm.includes(k)) { seen.add(k); score++ }
    }
    return score
  }, [STOP_WORDS])

  // Imagen ANCLADA POR MENSAJE: cada imagen se queda en el mensaje de Sophia
  // donde apareció — los mensajes nuevos fluyen debajo SIN moverla (antes la
  // imagen se pegaba al último mensaje y "saltaba" a cada respuesta nueva).
  // Se resuelve contra la lista GLOBAL por mejor descripción (señal confiable;
  // el número "imagen N" del prompt es ambiguo entre actividades). Fail-safe:
  // sin match confiable no se ancla nada (no mostrar una imagen equivocada).
  const [imageByMsg, setImageByMsg] = useState<Record<string, ClassImage>>({})
  const lastAnchoredUrlRef = useRef<string | null>(null)
  useEffect(() => {
    const msg = lastAssistantMessage
    const content = msg?.content
    // Nunca durante el saludo (el welcome presenta el tema y matchearía por
    // afinidad). Requiere al menos un mensaje del estudiante.
    if (!msg || !content || !hasUserMessage || galleryList.length === 0) return
    const scored = galleryList
      .filter((img) => img.showWhen !== 'on_demand') // on_demand: solo por galería
      .map((img) => ({ img, s: scoreMatch(content, img.description) }))
      .sort((a, b) => b.s - a.s)
    const best = scored[0]
    const second = scored[1]
    // Confianza: ≥2 keywords distintivas y claramente mejor que la segunda.
    if (!best || best.s < 2 || (second && best.s <= second.s)) return
    // No repetir la misma imagen que ya estaba anclada en el mensaje anterior:
    // se queda en su sitio en vez de duplicarse en cada respuesta.
    if (lastAnchoredUrlRef.current === best.img.url) return
    lastAnchoredUrlRef.current = best.img.url
    setImageByMsg((prev) => (prev[msg.id]?.url === best.img.url ? prev : { ...prev, [msg.id]: best.img }))
  }, [lastAssistantMessage?.id, lastAssistantMessage?.content, hasUserMessage, galleryList, scoreMatch])

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
        // El texto NO se muestra durante el streaming: se revela junto con la
        // voz (más abajo, cuando el audio está listo) para que texto y audio
        // salgan al mismo tiempo. Mientras tanto sigue el splash "Preparando…".

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

        welcomeAudioPlayedRef.current = true

        const setWelcomeText = (text: string, done: boolean) =>
          setMessages(prev => prev.map(m =>
            m.id === welcomeId
              ? { ...m, content: text, status: done ? 'completed' : 'streaming', isOptimistic: !done }
              : m
          ))

        // Sin voz: mostrar el texto completo de una y listo.
        if (!voiceEnabled) {
          setWelcomeText(cleanText, true)
        } else {
          // UNA sola llamada TTS del bloque completo → voz PAREJA (mismo pitch
          // y volumen de principio a fin; antes, una llamada por oración hacía
          // que cada frase sonara distinta). El texto se REVELA oración por
          // oración a ritmo de habla, en paralelo a la reproducción — se ve
          // progresivo sin partir el audio.
          let blob: Blob | null = null
          try {
            const r = await fetch('/api/voice/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: cleanText, language }),
            })
            blob = r.ok ? await r.blob() : null
          } catch { blob = null }

          const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)/g)?.map(s => s.trim()).filter(Boolean)
            ?? [cleanText]

          // Reproducir el audio completo (3D o normal) sin bloquear el reveal.
          const playPromise = blob ? speakChunkVia3D(blob, cleanText) : Promise.resolve()

          // Reveal por tiempo: ~360ms por palabra ≈ ritmo del TTS.
          const MS_PER_WORD = 360
          let revealed = ''
          for (let i = 0; i < sentences.length; i++) {
            revealed = revealed ? `${revealed} ${sentences[i]}` : sentences[i]
            setWelcomeText(revealed, i === sentences.length - 1)
            if (i < sentences.length - 1) {
              const words = sentences[i].split(/\s+/).filter(Boolean).length
              await new Promise((res) => setTimeout(res, Math.min(7000, Math.max(700, words * MS_PER_WORD))))
            }
          }
          setWelcomeText(cleanText, true) // asegurar texto completo
          await playPromise
        }
      } catch {
        // ignore
      } finally {
        setWelcomeLoading(false)
      }
    }
    initSession()
  }, [sessionId, playWelcomeAudio, speakReply, voiceEnabled, speakChunkVia3D])

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

  // Corta TODA la voz en curso: el <audio> compartido (singleton global que
  // no se detiene solo al desmontar) y el avatar 3D. Se llama al finalizar
  // (Salir / tiempo / cierre) para que Sophia no siga hablando.
  const stopAllAudio = () => {
    try {
      const a = getUnlockedAudio()
      if (a) { a.pause(); a.currentTime = 0 }
    } catch { /* ignore */ }
    try { talkingHeadRef.current?.stopSpeaking() } catch { /* ignore */ }
    setAvatarState('idle')
  }

  const finishAssessment = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    stopAllAudio()
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

  // Cantidad de imágenes ancladas — dispara el auto-scroll cuando aparece una.
  const anchoredImageCount = Object.keys(imageByMsg).length

  // Barra de progreso = segmentos por actividad, etiquetados con el punto
  // clave correspondiente. Se llenan con el avance real de la evaluación.
  const segTotal = progressData?.total || keyPoints.length || 0
  const pct = progressData?.percentage ?? 0
  const curPos = progressData?.current ?? 1 // 1-based
  const doneCount = pct >= 100 ? segTotal : Math.max(0, curPos - 1)
  const curSegIdx = pct >= 100 ? -1 : Math.min(Math.max(0, segTotal - 1), curPos - 1)
  const curKeyPoint = keyPoints[curSegIdx >= 0 ? curSegIdx : 0] ?? null

  // Mensajes con contenido (o en streaming) para el transcript estilo Claude.
  const visibleMessages = messages.filter((m) => m.content || m.status === 'streaming')

  // Auto-scroll al fondo: cada mensaje nuevo y cada chunk de streaming bajan
  // el chat hasta el final (incluye la imagen inline que aparece al final).
  useEffect(() => {
    const el = msgsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visibleMessages.length, lastAssistantMessage?.content, anchoredImageCount])

  // ¿Estamos preparando la clase? (generando el saludo, antes del primer texto)
  // Mientras tanto se muestra el splash "Preparando tu clase…" y se ocultan
  // los controles, para que nadie crea que ya puede hablar.
  const preparing = welcomeLoading && !lastAssistantMessage?.content

  return (
    <div className="h-full w-full max-w-[1600px] mx-auto px-3 py-2 flex flex-col gap-2 overflow-hidden">
      {/* Top bar: objetivo (ⓘ) · puntos clave como segmentos · timer · salir.
          z-index alto + overflow-visible para que el popover del objetivo
          flote por encima del avatar/chat y no quede tapado. */}
      <div className="relative z-30 shrink-0 flex items-center justify-between gap-4 bg-[#0d1f3c]/80 backdrop-blur border border-white/10 rounded-xl px-4 py-2">
        {/* Objetivo bajo demanda — no ocupa espacio fijo */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowGoal((v) => !v)}
            className={`grid place-items-center w-6 h-6 rounded-full border transition-colors ${showGoal ? 'text-[#fbc50b] border-[#fbc50b]/50' : 'text-slate-400 border-white/15 hover:text-[#fbc50b]'}`}
            title={t('session_objective_label')}
          >
            <Info className="h-4 w-4" />
          </button>
          {showGoal && (
            <div className="absolute top-8 left-0 z-50 w-80 bg-[#09222d] border border-[#fbc50b]/30 rounded-lg p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="h-3.5 w-3.5 text-[#fbc50b]" />
                <p className="text-xs font-semibold text-[#fbc50b]">{t('session_objective_label')}</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{lessonObjective}</p>
            </div>
          )}
        </div>

        {/* Puntos clave = barra de segmentos (un segmento por actividad). El
            actual brilla; su texto se lee siempre al lado; hover = ver ese punto. */}
        {segTotal > 0 && (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="flex gap-1 shrink-0">
              {Array.from({ length: segTotal }).map((_, i) => {
                const done = i < doneCount
                const cur = i === curSegIdx
                return (
                  <div
                    key={i}
                    title={keyPoints[i] ?? `${t('session_progress_label')} ${i + 1}`}
                    className={`h-1.5 w-9 rounded-full transition-colors ${
                      cur ? 'bg-[#fbc50b] shadow-[0_0_10px_rgba(251,197,11,.6)]'
                        : done ? 'bg-[#fbc50b]/80' : 'bg-white/12'
                    }`}
                  />
                )
              })}
            </div>
            {curKeyPoint && (
              <div className="hidden md:block text-xs text-slate-300 truncate min-w-0">
                <span className="text-[#fbc50b] font-semibold">{curSegIdx + 1}.</span> {curKeyPoint}
              </div>
            )}
          </div>
        )}

        {/* Timer · salir (el participante vive en el header) */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline text-xs text-slate-500">{language === 'EN' ? 'Time left' : 'Tiempo restante'}</span>
            <span className="font-mono">{timeLabel}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleFinishEarly}
            className="gap-1.5 text-slate-500 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('session_exit')}</span>
          </Button>
        </div>
      </div>

      {/* Cuerpo: Sophia (izquierda) · conversación estilo Claude (derecha).
          La conversación recibe algo más de ancho — es donde se lee. */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[42fr_58fr] gap-2 min-h-0">
        {/* IZQUIERDA: Sophia grande, fija. El motor 3D no se recarga porque
            su posición en el árbol no cambia. */}
        <div className="relative hidden lg:flex items-end justify-center overflow-hidden rounded-xl border border-[#fbc50b]/25 bg-[radial-gradient(circle_at_50%_38%,#12333f,#09222d_72%)]">
          {use3DAvatar ? (
            <SophiaTalkingHead
              ref={talkingHeadRef}
              width="100%"
              height="100%"
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
              className="w-full h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <SophiaAvatar state={avatarState} size={260} />
            </div>
          )}
          {/* Placeholder logo CETEMIN: cubre TODA la espera (carga del modelo +
              generación del saludo), no solo la carga. Crossfade a Sophia justo
              cuando empieza a hablar (cuando aparece el primer texto). Así no se
              ve "parada" — aparece ya hablando. También es respaldo digno si el
              3D fallara en algún equipo. */}
          <div
            className={`absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#12333f,#09222d_72%)] transition-opacity duration-700 ${preparing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={300} height={300} className="rounded-3xl shadow-2xl w-[40vh] max-w-[320px] h-auto" />
            </motion.div>
          </div>

          {/* Placa de nombre + estado */}
          <div className="absolute inset-x-0 bottom-0 p-4 text-center bg-gradient-to-t from-[#09222d] to-transparent pointer-events-none">
            <div className="text-2xl font-bold text-white">Sophia</div>
            <div className="text-xs text-[#fbc50b] mt-0.5 h-4">
              {avatarState === 'speaking' ? (language === 'EN' ? '● Speaking…' : '● Hablando…') : ''}
            </div>
          </div>
        </div>

        {/* DERECHA: conversación estilo Claude (bloques a todo el ancho) */}
        <div className="bg-[#0d1f3c]/60 backdrop-blur border border-white/10 rounded-xl flex flex-col min-h-0 p-3 relative">
          <div ref={msgsRef} className="flex-1 overflow-y-auto px-2 min-h-0 scroll-smooth">
            {/* Splash "Preparando tu clase…" — cubre la espera del saludo para
                que no parezca que ya se puede hablar. */}
            {preparing && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="flex gap-1.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                      className="block w-2.5 h-2.5 rounded-full bg-[#fbc50b]"
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold text-white">
                  {language === 'EN' ? 'Preparing your class…' : 'Preparando tu clase…'}
                </p>
                <p className="text-sm text-slate-400">
                  {language === 'EN' ? 'Sophia is about to start. One moment.' : 'Sophia está por comenzar. Un momento.'}
                </p>
              </div>
            )}

            {visibleMessages.map((m) => {
              const isAssistant = m.role === 'assistant'
              const msgImage = imageByMsg[m.id]
              return (
                <div key={m.id} className="py-4 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`grid place-items-center w-5 h-5 rounded-full text-[10px] font-extrabold ${isAssistant ? 'bg-[#fbc50b] text-[#09222d]' : 'bg-white/12 text-slate-300'}`}>
                      {isAssistant ? 'S' : (participantName.trim()[0]?.toUpperCase() || 'T')}
                    </span>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${isAssistant ? 'text-[#fbc50b]' : 'text-slate-400'}`}>
                      {isAssistant ? 'Sophia' : participantName.split(' ')[0]}
                    </span>
                  </div>
                  <div className={`text-base sm:text-lg leading-relaxed ${isAssistant ? 'text-slate-100' : 'text-slate-300'}`}>
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
                        code: ({ children }) => <code className="px-1 py-0.5 rounded bg-white/10 text-[#fbc50b] font-mono text-sm">{children}</code>,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                    {m.status === 'streaming' && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block ml-1 text-[#fbc50b]"
                      >▊</motion.span>
                    )}
                  </div>

                  {/* Imagen anclada a ESTE mensaje (se queda en su sitio cuando
                      llegan respuestas nuevas). Respeta el formato real de la
                      imagen: <img> con alto/ancho automáticos, sin caja fija. */}
                  {isAssistant && msgImage && (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(galleryIndexOf(msgImage.url))}
                      className="mt-3 block rounded-xl overflow-hidden border border-[#fbc50b]/30 hover:border-[#fbc50b]/60 transition-colors group w-fit"
                    >
                      <div className="relative bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msgImage.url}
                          alt={msgImage.description}
                          className="block max-w-[460px] max-h-[300px] w-auto h-auto"
                        />
                        <span className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-slate-200 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="px-3 py-2 text-xs text-[#fbc50b] bg-[#fbc50b]/10 flex items-center gap-1.5">
                        <Maximize2 className="h-3 w-3" />
                        {language === 'EN' ? 'Tap to enlarge' : 'Toca para ampliar'}
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Hint móvil */}
          {isMobile && voiceEnabled && (
            <div className="shrink-0 flex items-center justify-center pt-2">
              <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-400/20 rounded-full px-3 py-1">
                {t('session_writing_hint')}
              </p>
            </div>
          )}

          {/* Controles: voz + escribir al centro (conversación) · imágenes a la
              derecha (recurso). Ocultos mientras se prepara la clase. */}
          <div className={`shrink-0 mt-3 pt-3 border-t border-white/10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${preparing ? 'invisible' : ''}`}>
            <span />
            <div className="flex items-center justify-center gap-3">
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
            {/* Imágenes: recurso a la derecha, ocupa lo mínimo */}
            <div className="justify-self-end">
              {galleryList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(0)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#fbc50b]/35 bg-[#fbc50b]/10 text-[#fbc50b] px-3 py-2 text-sm font-semibold hover:bg-[#fbc50b]/20 transition-colors"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{language === 'EN' ? 'Images' : 'Imágenes'}</span>
                  <span className="grid place-items-center min-w-5 h-5 px-1.5 rounded-full bg-[#fbc50b] text-[#09222d] text-[11px] font-extrabold">{galleryList.length}</span>
                </button>
              )}
            </div>
          </div>

          {/* Input de texto colapsable */}
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
        </div>
      </div>

      {/* Lightbox / galería de imágenes con navegación ‹ › */}
      <AnimatePresence>
        {lightboxIndex !== null && galleryList[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute top-4 right-4 bg-white/10 border-white/20 text-white hover:bg-white/20 z-10"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {galleryList.length > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full h-12 w-12 z-10"
                  onClick={(e) => { e.stopPropagation(); navLightbox(-1) }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full h-12 w-12 z-10"
                  onClick={(e) => { e.stopPropagation(); navLightbox(1) }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            <motion.div
              key={galleryList[lightboxIndex].url}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-[90vw] max-h-[88vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ height: '72vh' }}>
                <Image
                  src={galleryList[lightboxIndex].url}
                  alt={galleryList[lightboxIndex].description}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </div>
              <div className="mt-3 bg-[#0d1f3c]/90 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-200 leading-relaxed">{galleryList[lightboxIndex].description}</p>
                {galleryList.length > 1 && (
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{lightboxIndex + 1} / {galleryList.length}</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
