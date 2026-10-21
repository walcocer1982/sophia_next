'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { type ChatInputRef } from './chat-input'
import { Cuaderno, type ActividadDelCuaderno } from './cuaderno'
import { DevToolsModal } from './dev-tools-modal'
import { SurveyModal } from './survey-modal'
import { useProgress } from './progress-context'
import type { ChatMessage, OptimisticMessage } from '@/types/chat'
import type { PlannerAttachment } from '@/types/planner'
import { streamChatResponse } from '@/lib/chat-stream'
import { useMaterial } from './material-context'
import { paraGuardar, pendientesDeSubrayar } from '@/lib/subrayado'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: ChatMessage[]
  lessonTitle: string
  objective?: string
  keyPoints?: string[]
  /** «Sophia lee sus mensajes en voz alta» (configuración del curso; voz del navegador). */
  voiceEnabled?: boolean
  allowPaste?: boolean
  allowAttachments?: boolean
  /** A dónde vuelve el alumno al terminar (la sesión de prueba, al curso del planner). */
  exitHref?: string
  exitLabel?: string
  /** «Probar como estudiante»: sin herramientas de desarrollo y sin material sin validar. */
  comoEstudiante?: boolean
  /** Las actividades de la lección, con su nombre (regla de nombres). */
  actividades?: ActividadDelCuaderno[]
}

export function ChatInterface({
  sessionId,
  initialMessages,
  lessonTitle,
  objective = '',
  keyPoints = [],
  voiceEnabled = true,
  allowPaste = false,
  allowAttachments = false,
  exitHref = '/lessons',
  exitLabel = 'Volver a mis lecciones',
  comoEstudiante = false,
  actividades = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(
    initialMessages.map((msg) => ({
      ...msg,
      status: 'completed',
      isOptimistic: false,
    }))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [isGeneratingWelcome, setIsGeneratingWelcome] = useState(
    initialMessages.length === 0
  )
  // Survey: se abre 2s después de completar la última actividad. Si ya fue
  // respondida (consultamos al montar), no se vuelve a abrir.
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyAlreadySubmitted, setSurveyAlreadySubmitted] = useState(false)
  const { progress, updateProgress } = useProgress()
  const streamingContentRef = useRef<string>('')
  const assistantIdRef = useRef<string>('')
  const hasGeneratedWelcome = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)

  // Herramientas de desarrollo: nunca en la vista de estudiante.
  const isDevelopment = process.env.NODE_ENV === 'development' && !comoEstudiante

  // Lección terminada (decisión del 13 oct 2026): tarjeta de cierre y caja de
  // texto cerrada. «Hacer una pregunta más» la reabre a propósito; antes la
  // conversación seguía por inercia y el alumno no sabía que había terminado.
  const [preguntaExtra, setPreguntaExtra] = useState(false)
  const cerrada = progress.completedAt !== null && !preguntaExtra
  const hacerUnaPreguntaMas = () => {
    setPreguntaExtra(true)
    setTimeout(() => chatInputRef.current?.focus(), 150)
  }

  // El panel muestra lo que Sophia citó: se calcula de sus mensajes, también
  // mientras escribe, para que el bloque aparezca cuando lo nombra.
  const { reportMessages, getMaterialState, subrayados, blocksById, reportSubrayadosRevisados, registrarRevisor, setPendienteSubrayar, openBlock, subrayadosRevisados } = useMaterial()
  useEffect(() => {
    reportMessages(messages.filter((m) => m.role === 'assistant').map((m) => m.content))
  }, [messages, reportMessages])
  // La pizarra marca en verde o gris lo revisado (lib/subrayado.ts): se lee de las respuestas del alumno.
  useEffect(() => {
    reportSubrayadosRevisados(messages.filter((m) => m.role === 'user').map((m) => m.material))
  }, [messages, reportSubrayadosRevisados])

  // Generate welcome message if chat is empty
  useEffect(() => {
    if (
      initialMessages.length === 0 &&
      messages.length === 0 &&
      !hasGeneratedWelcome.current
    ) {
      hasGeneratedWelcome.current = true
      generateWelcomeMessage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  // Chequeo inicial: ¿ya respondió la encuesta de esta sesión?
  // Si sí, no la mostramos de nuevo aunque la lección esté completa.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/survey/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.submitted) setSurveyAlreadySubmitted(true)
        // Si la sesión ya está completada y no contestó, mostramos el modal
        // (caso: entró de nuevo a una sesión vieja sin haber respondido).
        else if (data.completedAt) {
          setTimeout(() => {
            if (!cancelled) setShowSurvey(true)
          }, 1500)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const generateWelcomeMessage = async () => {
    setIsGeneratingWelcome(true)
    streamingContentRef.current = ''

    // Crear placeholder optimistic para welcome message
    const welcomeId = 'welcome-' + Date.now()
    assistantIdRef.current = welcomeId

    const welcomePlaceholder: OptimisticMessage = {
      id: welcomeId,
      sessionId,
      role: 'assistant',
      content: '', // ⭐ Vacío inicialmente (mostrar skeleton)
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
      isWelcome: true,
      activityId: progress.currentActivityId,
    }

    // Agregar placeholder inmediatamente
    setMessages([welcomePlaceholder])

    try {
      const response = await fetch('/api/chat/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...(comoEstudiante ? { comoEstudiante: true } : {}) }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate welcome message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      // La bienvenida se ve mientras se escribe. Si el curso tiene «Sophia lee
      // en voz alta», el Cuaderno la lee al terminar con la voz del navegador
      // (antes se esperaba el audio de OpenAI, retirado el 14 oct 2026).
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamingContentRef.current += decoder.decode(value, { stream: true })
        const visto = streamingContentRef.current
        setMessages((prev) => prev.map((m) => (m.id === welcomeId ? { ...m, content: visto } : m)))
      }
      streamingContentRef.current = ''
      setMessages((prev) =>
        prev.map((m) => (m.id === welcomeId ? { ...m, status: 'completed', isOptimistic: false } : m))
      )
    } catch (error) {
      console.error('Error generating welcome message:', error)
      toast.error('Error al generar mensaje de bienvenida')

      // Marcar como error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === welcomeId
            ? {
                ...m,
                status: 'error',
                content: 'Error al generar mensaje de bienvenida.',
                isOptimistic: false,
              }
            : m
        )
      )
    } finally {
      setIsGeneratingWelcome(false)
      // Auto-focus on input after welcome message
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
    }
  }

  // Al tocar una línea en la pizarra se revisa enseguida (21 oct 2026), si es su
  // turno y ya respondió la pregunta de esta actividad. Si no respondió, la línea
  // queda marcada y viaja con la respuesta que escriba.
  const revisarAlTocar = useRef<() => boolean>(() => false)
  useEffect(() => {
    revisarAlTocar.current = () => {
      if (isLoading || isGeneratingWelcome || cerrada) return false
      const actual = progress.currentActivityId
      if (!messages.some((m) => m.role === 'user' && m.activityId === actual)) return false
      void handleSendMessage('listo')
      return true
    }
  })
  useEffect(() => {
    registrarRevisor(() => revisarAlTocar.current())
    return () => registrarRevisor(null)
  }, [registrarRevisor])

  // Pedido de tocar una línea (lectura comprobada): lo dice el último mensaje de
  // Sophia, que en ese turno escribe el código con una frase fija
  // (lib/subrayado.ts). Mientras la línea no se toque, la pizarra la ilumina y la
  // caja avisa que no hace falta escribir de nuevo (prueba de Edwin, 21 oct 2026).
  // Y sigue pendiente mientras la última revisión sea «no respalda» (línea
  // equivocada), hasta que una salga verde o se revele (lib/subrayado.ts).
  const ultimoDeSophia = [...messages].reverse().find((m) => m.role === 'assistant')
  const actividadActual = progress.currentActivityId
  const pendientes = useMemo(() => {
    if (isLoading || cerrada) return { ids: [] as string[], motivo: null }
    return pendientesDeSubrayar({
      ultimoMensajeDeSophia: ultimoDeSophia?.content ?? null,
      bloques: [...blocksById.values()],
      subrayados,
      revisados: subrayadosRevisados,
      actividadActual,
    })
  }, [ultimoDeSophia, isLoading, cerrada, blocksById, subrayados, subrayadosRevisados, actividadActual])
  useEffect(() => {
    setPendienteSubrayar(pendientes.ids)
  }, [pendientes, setPendienteSubrayar])
  const avisoSubrayar = pendientes.ids.length && pendientes.motivo
    ? { titulos: pendientes.ids.map((id) => blocksById.get(id)?.title ?? '').filter(Boolean), motivo: pendientes.motivo, onIr: () => openBlock(pendientes.ids[0]) }
    : null

  const handleSendMessage = async (content: string, attachments?: PlannerAttachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isLoading) return

    setIsLoading(true)

    // 1. Crear mensaje del usuario
    const userMessage: OptimisticMessage = {
      id: 'user-' + Date.now(),
      sessionId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
      status: 'completed',
      isOptimistic: false,
      activityId: progress.currentActivityId,
      // Lo subrayado en los textos de esta actividad se ve bajo la respuesta al
      // enviar; el servidor guarda lo mismo en el mensaje (Message.material).
      material: (() => {
        const subrayado = Object.entries(subrayados)
          .map(([id, s]) => {
            const b = blocksById.get(id)
            return b?.type === 'text' && b.activityId === progress.currentActivityId ? paraGuardar(b, s) : null
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
        return subrayado.length ? { subrayado } : undefined
      })(),
    }

    // 2. Crear placeholder optimistic para respuesta del instructor
    const assistantId = 'assistant-' + Date.now()
    assistantIdRef.current = assistantId

    const assistantPlaceholder: OptimisticMessage = {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '', // ⭐ Vacío inicialmente (mostrar skeleton)
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
      activityId: progress.currentActivityId,
    }

    // 3. Agregar AMBOS mensajes inmediatamente
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])

    // 4. Resetear ref de contenido
    streamingContentRef.current = ''

    try {
      await streamChatResponse(
        sessionId,
        content.trim(),
        // onChunk: Acumular texto en el mensaje optimistic
        (text) => {
          streamingContentRef.current += text

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamingContentRef.current } : m
            )
          )
        },
        // onDone: Marcar como completado
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, status: 'completed', isOptimistic: false }
                : m
            )
          )
          streamingContentRef.current = ''
          setIsLoading(false)
          // Auto-focus on input after AI finishes
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        },
        // onError: Marcar como error
        (error) => {
          console.error('Streaming error:', error)
          toast.error('Error al recibir respuesta. Intenta de nuevo.')

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    status: 'error',
                    content: 'Error al recibir respuesta. Por favor, intenta de nuevo.',
                    isOptimistic: false,
                  }
                : m
            )
          )
          setIsLoading(false)
        },
        // onActivityCompleted: update shared progress immediately
        (progressData) => {
          // Como en el servidor: la respuesta que cierra una actividad ya
          // presenta la siguiente y se archiva bajo ella.
          if (progressData.nextActivityId) {
            const siguiente = progressData.nextActivityId
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, activityId: siguiente } : m)))
          }
          updateProgress({
            currentActivityId: progressData.nextActivityId ?? progress.currentActivityId,
            current: progressData.currentPosition,
            total: progressData.total,
            currentActivity: progressData.nextActivityTitle || progressData.activityTitle,
            percentage: progressData.percentage,
            lastCompletedId: progressData.activityId,
            lastCompletedAt: progressData.completedAt || null,
            // `completedAt` del progreso es el de la SESIÓN: solo con la última
            // actividad. Antes se marcaba con cada actividad terminada.
            ...(progressData.isLastActivity
              ? { completedAt: progressData.completedAt || new Date().toISOString() }
              : {}),
          })

          // Toast inmediato
          if (progressData.isLastActivity) {
            toast.success('¡Felicitaciones!', {
              description: '¡Completaste toda la lección!',
            })
            // 2s después abrimos el modal de encuesta — da tiempo a que
            // Sophia termine de hablar/leer su cierre. Solo si no respondió
            // antes (encuesta de la misma sessionId).
            if (!surveyAlreadySubmitted) {
              setTimeout(() => setShowSurvey(true), 2000)
            }
          } else {
            toast.success('¡Completaste una actividad!', {
              description: 'Avanzando a la siguiente...',
            })
          }
        },
        attachments,
        getMaterialState(),
        comoEstudiante,
        // El servidor revisó el subrayado: la respuesta del alumno muestra el resultado.
        (material) => setMessages((prev) => prev.map((m) => (m.id === userMessage.id ? { ...m, material } : m))),
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje. Intenta de nuevo.')
      // Remover ambos mensajes en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId))
      setIsLoading(false)
    }
  }

  // Encuesta NPS post-lección. Va en las DOS vistas: hasta el 13 oct 2026 solo
  // estaba en la vista Chat y en la Tutor (la que abre por defecto) nunca salía.
  const encuesta = (
    <SurveyModal
      open={showSurvey}
      onOpenChange={setShowSurvey}
      sessionId={sessionId}
      onSubmitted={() => setSurveyAlreadySubmitted(true)}
    />
  )

  // Una sola vista desde el 14 oct 2026: el Cuaderno (components/learning/cuaderno.tsx).
  // Reemplaza a la vista Tutor, a la vista Chat y al panel derecho.
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {isDevelopment && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDevTools(true)}
            className="h-8 w-8 border-white/20 bg-[#0f2238]/90 text-[#a9b8c2] hover:bg-[#132a44] hover:text-white"
            title="Dev Tools"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Cuaderno
        lessonTitle={lessonTitle}
        objective={objective}
        keyPoints={keyPoints}
        messages={messages}
        actividades={actividades}
        actividadActualId={progress.currentActivityId}
        onSendText={handleSendMessage}
        isLoading={isLoading}
        isGeneratingWelcome={isGeneratingWelcome}
        leerEnVoz={voiceEnabled}
        allowPaste={allowPaste}
        allowAttachments={allowAttachments}
        cerrada={cerrada}
        exitHref={exitHref}
        exitLabel={exitLabel}
        onAskMore={hacerUnaPreguntaMas}
        chatInputRef={chatInputRef}
        avisoSubrayar={avisoSubrayar}
      />

      {isDevelopment && (
        <DevToolsModal
          open={showDevTools}
          onOpenChange={setShowDevTools}
          sessionId={sessionId}
        />
      )}
      {encuesta}
    </div>
  )
}
