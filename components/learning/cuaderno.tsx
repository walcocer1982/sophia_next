'use client'

/**
 * Vista «Cuaderno» de /learn (14 oct 2026): reemplaza a la vista Tutor y a la
 * vista Chat. La conversación se lee como una hoja de trabajo: una sección por
 * actividad, con su nombre (regla de nombres, lib/planner/titulos.ts). Lo que
 * se pide va destacado justo encima de la caja de respuesta. El material está
 * en la Pizarra (pizarra.tsx), al lado; cada mensaje que cita algo lleva un
 * enlace «Ver en la pizarra». Colores del kiosko del World Mining Congress
 * (tema noche, app/globals.css).
 * Diseño: investigacion/design-leccion/propuestas-ui.html (propuesta B).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { citedBlocksInOrder, stripMarkers, splitChoiceOptions } from '@/lib/material-markers'
import { agruparPorActividad, arreglarNegritas, separarCierreDeLaAnterior, separarPedido } from '@/lib/cuaderno'
import { leerSubrayadoGuardado } from '@/lib/subrayado'
import type { OptimisticMessage } from '@/types/chat'
import type { PlannerAttachment } from '@/types/planner'
import { useMaterial } from './material-context'
import { ChoiceButtons } from './message-material'
import { ChatInput, type ChatInputRef } from './chat-input'
import { PlayAudioButton } from './play-audio-button'
import { LessonCompleteCard } from './lesson-complete-card'
import { QueVasALograr } from './que-vas-a-lograr'
import { useLectura } from '@/hooks/use-lectura'
import { alFinal, desplazarDentro } from '@/lib/desplazar'

export interface ActividadDelCuaderno {
  id: string
  titulo: string
  subtitulo?: string
}

interface CuadernoProps {
  lessonTitle: string
  objective: string
  keyPoints: string[]
  messages: OptimisticMessage[]
  actividades: ActividadDelCuaderno[]
  actividadActualId: string | null
  onSendText: (text: string, attachments?: PlannerAttachment[]) => Promise<void>
  isLoading: boolean
  isGeneratingWelcome: boolean
  /** El curso tiene «Sophia lee sus mensajes en voz alta» (voz del navegador). */
  leerEnVoz?: boolean
  allowPaste?: boolean
  allowAttachments?: boolean
  cerrada: boolean
  exitHref: string
  exitLabel: string
  onAskMore?: () => void
  /** Prueba cerrada: la tarjeta de cierre lo dice y no ofrece «una pregunta más». */
  pruebaCerrada?: boolean
  chatInputRef: React.RefObject<ChatInputRef | null>
  /**
   * Falta tocar una línea en la pizarra (lectura comprobada). Aviso sobre la caja,
   * para que no vuelva a escribir la respuesta (prueba de Edwin, 21 oct 2026).
   */
  avisoSubrayar?: { titulos: string[]; motivo: 'pedido' | 'equivocada'; onIr: () => void } | null
}

export function Cuaderno({
  lessonTitle,
  objective,
  keyPoints,
  messages,
  actividades,
  actividadActualId,
  onSendText,
  isLoading,
  isGeneratingWelcome,
  leerEnVoz = false,
  allowPaste = false,
  allowAttachments = false,
  cerrada,
  exitHref,
  exitLabel,
  onAskMore,
  pruebaCerrada = false,
  chatInputRef,
  avisoSubrayar = null,
}: CuadernoProps) {
  const orden = useMemo(() => actividades.map((a) => a.id), [actividades])
  const actualId = actividadActualId ?? orden[0] ?? null
  const indiceActual = Math.max(0, actualId ? orden.indexOf(actualId) : 0)

  const secciones = useMemo(() => agruparPorActividad(messages, orden, actualId), [messages, orden, actualId])
  // Lo que se ve abierto: la sección actual (o la última si terminó) y las que el alumno abra.
  const ultimaId = secciones.at(-1)?.actividadId ?? null
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  // La actividad que acaba de cerrarse sigue abierta hasta que el alumno responde
  // la nueva: ahí está el feedback de Sophia. Antes se plegaba apenas llegaba el
  // mensaje y el feedback desaparecía sin dar tiempo a leerlo (20 oct 2026).
  const ultima = secciones.at(-1)
  const previaAbierta =
    secciones.length >= 2 && ultima && !ultima.mensajes.some((m) => m.role === 'user')
      ? secciones[secciones.length - 2].actividadId
      : null
  const fijaAbierta = (id: string) => id === ultimaId || id === actualId || id === previaAbierta
  const estaAbierta = (id: string) => fijaAbierta(id) || abiertas.has(id)
  const alternar = (id: string) =>
    setAbiertas((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })

  // El párrafo con que Sophia cierra una actividad llega en el mensaje que abre
  // la siguiente: se dibuja al final de la sección anterior (lib/cuaderno.ts).
  // También mientras se escribe, apenas el primer párrafo está completo (exige un
  // párrafo después). 20 oct 2026: si se esperaba al final, el mensaje pasaba
  // entero a la actividad nueva y el feedback saltaba a la anterior al terminar.
  const cierres = useMemo(() => {
    const porSeccion = new Map<number, { mensajeId: string; cierre: string; resto: string }>()
    secciones.forEach(({ mensajes }, i) => {
      const m = mensajes[0]
      if (i === 0 || !m || m.role !== 'assistant' || m.status === 'error') return
      const { cierre, resto } = separarCierreDeLaAnterior(m.content)
      if (cierre) porSeccion.set(i, { mensajeId: m.id, cierre, resto })
    })
    return porSeccion
  }, [secciones])

  // El último mensaje de Sophia con contenido: es el que lleva el pedido destacado y los botones.
  const ultimoDeSophia = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'assistant' && m.status !== 'error' && m.content.trim()) return m
    }
    return null
  }, [messages])

  // «Sophia lee en voz alta» (configuración del curso): cada mensaje nuevo de
  // Sophia se lee al terminar de escribirse. Los que ya estaban al cargar, no.
  // El navegador puede bloquear la primera lectura hasta que el alumno toque
  // algo; entonces queda el botón «Escuchar».
  const lectura = useLectura()
  const yaLeidos = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (yaLeidos.current === null) {
      yaLeidos.current = new Set(messages.filter((m) => m.status !== 'streaming').map((m) => m.id))
      return
    }
    const m = ultimoDeSophia
    if (!leerEnVoz || !lectura.soportado || !m || m.status === 'streaming' || yaLeidos.current.has(m.id)) return
    yaLeidos.current.add(m.id)
    lectura.leer(m.content, m.id)
  }, [ultimoDeSophia, messages, leerEnVoz, lectura])

  // Desplazamiento de la hoja (21 oct 2026, capturas de Walther). Solo se mueve la
  // hoja, nunca la página (lib/desplazar.ts): con scrollIntoView subía la lección
  // entera y abajo quedaba una franja blanca. Y un mensaje nuevo de Sophia se ve
  // desde su comienzo: antes se seguía el final mientras escribía y, al terminar,
  // había que subir para leerlo.
  // - Al cargar: el historial, desde el final.
  // - El alumno envía: al final (su respuesta y «Sophia está escribiendo»).
  // - Empieza un mensaje de Sophia: su comienzo arriba, una vez; no se sigue el final.
  const hojaRef = useRef<HTMLDivElement>(null)
  const anclados = useRef<Set<string> | null>(null)
  const ultimo = messages.at(-1)
  useEffect(() => {
    const hoja = hojaRef.current
    if (!hoja) return
    if (anclados.current === null) {
      anclados.current = new Set(messages.filter((m) => m.role === 'assistant' && m.content.trim()).map((m) => m.id))
      alFinal(hoja)
      return
    }
    if (!ultimo) return
    if (ultimo.role === 'user') {
      alFinal(hoja, true)
      return
    }
    if (ultimo.role === 'assistant' && ultimo.content.trim() && !anclados.current.has(ultimo.id)) {
      anclados.current.add(ultimo.id)
      const id = ultimo.id
      // El comienzo puede estar al final de la sección anterior (el párrafo de cierre).
      requestAnimationFrame(() => desplazarDentro(hoja, hoja.querySelector(`[data-inicio-sophia="${id}"]`), 'inicio'))
    }
  }, [messages, ultimo])
  // El riel muestra la lección terminada solo si de verdad terminó: una prueba
  // cerrada a medias se lee con su avance real (21 oct 2026).
  const terminada = cerrada && !pruebaCerrada
  const irA = (id: string) => {
    setAbiertas((prev) => new Set(prev).add(id))
    requestAnimationFrame(() => desplazarDentro(hojaRef.current, document.getElementById(`seccion-${id}`), 'inicio'))
  }

  return (
    <div className="tema-noche flex h-full min-h-0">
      {/* Riel de avance: con nombres en pantallas anchas, solo números en
          laptops (la pizarra necesita el espacio); oculto en celular. */}
      <nav aria-label="Avance de la lección" className="hidden lg:flex shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0b1a2e] py-4 lg:w-14 lg:px-2 xl:w-64 xl:px-3">
        {/* El objetivo de la lección, junto al avance (decisión del 14 oct 2026) */}
        <div className="mb-3 flex justify-center xl:block">
          <QueVasALograr lessonTitle={lessonTitle} objective={objective} keyPoints={keyPoints} forma="riel" className="hidden xl:inline-flex" />
          <QueVasALograr lessonTitle={lessonTitle} objective={objective} keyPoints={keyPoints} forma="icono" className="xl:hidden" />
        </div>
        <p className="mb-2 px-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#7f909b] xl:text-left">
          <span className="xl:hidden">{terminada ? actividades.length : indiceActual + 1}/{actividades.length}</span>
          <span className="hidden xl:inline">Tu avance · {terminada ? actividades.length : indiceActual + 1} de {actividades.length}</span>
        </p>
        {/* Segmentos de avance, uno por actividad (como el kiosko del WMC); antes
            iban en la barra de arriba, donde competían con el título. */}
        <div className="mb-3 hidden gap-1 px-2 xl:flex" aria-hidden>
          {actividades.map((a, i) => {
            const hecha = terminada || i < indiceActual
            const actual = !terminada && i === indiceActual
            return (
              <span
                key={a.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  hecha && 'bg-[#fbc50b]/80',
                  actual && 'bg-[#fbc50b] shadow-[0_0_8px_rgba(251,197,11,0.7)]',
                  !hecha && !actual && 'bg-white/15',
                )}
              />
            )
          })}
        </div>
        <ol className="space-y-0.5">
          {actividades.map((a, i) => {
            const hecha = terminada || i < indiceActual
            const actual = !terminada && i === indiceActual
            const conMensajes = secciones.some((s) => s.actividadId === a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={!conMensajes}
                  onClick={() => irA(a.id)}
                  aria-current={actual ? 'step' : undefined}
                  title={a.titulo}
                  className={cn(
                    'w-full min-h-10 flex items-center justify-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-[13px] leading-snug xl:justify-start xl:px-2',
                    actual && 'bg-[#fbc50b]/12 text-white font-semibold',
                    hecha && 'text-[#c9d4da] hover:bg-white/5',
                    !hecha && !actual && 'text-[#6d7d88]',
                    !conMensajes && 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-extrabold border',
                      hecha && 'bg-[#fbc50b] border-[#fbc50b] text-[#09222d]',
                      actual && 'border-[#fbc50b] text-[#fbc50b]',
                      !hecha && !actual && 'border-white/20',
                    )}
                  >
                    {hecha ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  <span className="hidden xl:inline">{a.titulo}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* La hoja: la columna ya tiene su ancho de lectura (tope en learning-layout);
          el texto lleva el mismo margen a los dos lados (14 oct 2026). */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* La conversación se pega a la caja, como en un chat: con pocos mensajes,
            el vacío queda arriba y no entre el último mensaje y la caja. */}
        <div ref={hojaRef} className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="mt-auto w-full px-4 pt-6 pb-4 sm:px-6 lg:px-10">
            {isGeneratingWelcome && !messages.some((m) => m.content.trim()) && (
              <p className="flex items-center gap-3 text-[#a9b8c2]">
                <Puntos /> Sophia está preparando tu clase…
              </p>
            )}

            {secciones.map(({ actividadId, mensajes }, iSeccion) => {
              const idx = orden.indexOf(actividadId)
              const act = actividades[idx]
              const abierta = estaAbierta(actividadId)
              const ultimaRespuesta = [...mensajes].reverse().find((m) => m.role === 'user')
              const pasada = actividadId !== ultimaId && actividadId !== actualId
              const plegable = !fijaAbierta(actividadId)
              const cierreDeEsta = cierres.get(iSeccion + 1)
              const recorte = cierres.get(iSeccion)
              return (
                <section key={actividadId} id={`seccion-${actividadId}`} className="scroll-mt-4 mb-8">
                  {/* Una sola línea (19 oct 2026): «Actividad 5 · Nombre · Caso». Antes
                      eran tres niveles con título serif de 22 px y pesaban más
                      que la conversación. */}
                  <header className="mb-4 border-b border-white/10 pb-2">
                    <button type="button" onClick={() => alternar(actividadId)} className="group flex w-full items-start gap-2 text-left" aria-expanded={abierta}>
                      <h2 className={cn('flex-1 text-[15px] font-semibold leading-snug sm:text-base', pasada ? 'text-[#c3ced6]' : 'text-white')}>
                        <span className="font-bold text-[#fbc50b]">Actividad {idx + 1}</span>
                        <span className="text-[#7f909b]"> · </span>
                        {act?.titulo ?? `Actividad ${idx + 1}`}
                        {act?.subtitulo && (
                          <>
                            <span className="text-[#7f909b]"> · </span>
                            <span className="font-normal text-[#a9b8c2]">{act.subtitulo}</span>
                          </>
                        )}
                      </h2>
                      {plegable && (
                        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-[#7f909b] transition-transform', abierta && 'rotate-180')} aria-hidden />
                      )}
                    </button>
                  </header>

                  {!abierta ? (
                    (ultimaRespuesta || cierreDeEsta) && (
                      <div className="space-y-1 border-l-2 border-white/15 pl-3 text-sm text-[#a9b8c2]">
                        {ultimaRespuesta && <p>Respondiste: «{recortar(ultimaRespuesta.content, 140)}»</p>}
                        {/* Lo que Sophia le dijo al cerrar: sin abrir la sección se recuerda el feedback */}
                        {cierreDeEsta && <p><span className="text-[#fbc50b]/80">Sophia:</span> {recortar(stripMarkers(cierreDeEsta.cierre).replace(/\*\*/g, ''), 180)}</p>}
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      {mensajes.map((m) =>
                        m.role === 'user' ? (
                          <Respuesta key={m.id} texto={m.content} material={m.material} />
                        ) : (
                          <div key={m.id} data-inicio-sophia={m.id}>
                            <MensajeDeSophia
                              mensaje={recorte?.mensajeId === m.id ? { ...m, content: recorte.resto } : m}
                              esElUltimo={m.id === ultimoDeSophia?.id && !cerrada}
                              ocupado={isLoading || isGeneratingWelcome}
                              onChoose={(t) => onSendText(t)}
                            />
                          </div>
                        ),
                      )}
                      {cierreDeEsta && (
                        <div data-inicio-sophia={cierreDeEsta.mensajeId} className="min-w-0 text-[16px] leading-relaxed text-[#e6edf1]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{conSaltos(arreglarNegritas(stripMarkers(cierreDeEsta.cierre)))}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })}

            {cerrada && (
              <LessonCompleteCard
                lessonTitle={lessonTitle}
                exitHref={exitHref}
                exitLabel={exitLabel}
                onAskMore={onAskMore}
                {...(pruebaCerrada ? { titulo: 'Esta prueba quedó guardada', detalle: 'Es solo lectura: la cerraste al empezar otra prueba.' } : {})}
              />
            )}
          </div>
        </div>

        {/* La caja de respuesta (al terminar, la tarjeta de cierre la reemplaza) */}
        {!cerrada && (
          <div className="shrink-0 border-t border-white/10 bg-[#0b1a2e]">
            <div className="px-4 py-3 sm:px-6 lg:px-10">
              {avisoSubrayar && (
                <div role="status" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#fbc50b]/50 bg-[#fbc50b]/10 px-3 py-2 text-[14px] leading-snug text-[#f3e2a6]">
                  <span className="min-w-0 flex-1">
                    {avisoSubrayar.motivo === 'equivocada'
                      ? `La línea que tocaste en ${avisoSubrayar.titulos.map((t) => `«${t}»`).join(' o ')} no respalda tu respuesta. Toca otra.`
                      : `Falta tocar en ${avisoSubrayar.titulos.map((t) => `«${t}»`).join(' o ')} la línea que respalda tu respuesta. No hace falta escribir de nuevo.`}
                  </span>
                  <button
                    type="button"
                    onClick={avisoSubrayar.onIr}
                    className="min-h-9 shrink-0 rounded-md bg-[#fbc50b] px-3 text-[13px] font-semibold text-[#09222d] hover:bg-[#ffd43b]"
                  >
                    Ir a la línea
                  </button>
                </div>
              )}
              <ChatInput
                ref={chatInputRef}
                variant="dark"
                onSend={onSendText}
                disabled={isLoading || isGeneratingWelcome}
                isGeneratingWelcome={isGeneratingWelcome}
                isThinking={isLoading}
                isStreaming={false}
                allowPaste={allowPaste}
                allowAttachments={allowAttachments}
                placeholder="Tu respuesta…"
                dictado
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * La respuesta del alumno: burbuja redondeada a la derecha, sin círculo ni
 * etiqueta, como en ChatGPT (decisión del 14 oct 2026). Sophia va como texto
 * limpio a la izquierda, también sin avatar: con eso basta para saber quién habla.
 */
function Respuesta({ texto, material }: { texto: string; material?: unknown }) {
  const subrayado = leerSubrayadoGuardado(material)
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-3xl bg-white/[0.09] px-4 py-2.5 text-[15px] leading-relaxed text-[#e6edf1]">
        {texto}
      </div>
      {/* Lo que subrayó en la pizarra al responder (turno de subrayar, 20 oct 2026) */}
      {subrayado.map((s) => (
        <p key={s.blockId} className="max-w-[75%] text-right text-[13px] leading-snug text-[#a9b8c2]">
          Subrayaste en «{s.titulo}»: {s.lineas.map((l, i) => (
            <span key={i} className="text-[#e6edf1] underline decoration-[#fbc50b] decoration-2 underline-offset-4">
              {i > 0 && ' · '}«{l}»
            </span>
          ))}
          {s.resultado === 'respalda' && <span className="ml-1 font-semibold text-[#8fe0ad]">✓ respalda tu respuesta</span>}
          {s.resultado === 'no_respalda' && <span className="ml-1 font-semibold text-[#f5a3a3]">✗ no respalda tu respuesta</span>}
        </p>
      ))}
    </div>
  )
}

const md = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2.5 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-white">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-2.5 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-2.5 list-decimal space-y-1 pl-5">{children}</ol>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="rounded bg-white/10 px-1 text-[#fbc50b]">{children}</code>,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-2.5 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => <th className="border-b border-white/15 px-2 py-1.5 text-left font-bold text-[#a9b8c2]">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="border-b border-white/5 px-2 py-1.5">{children}</td>,
}

/** Los saltos de línea simples de Sophia se respetan (tablas y opciones una por línea). */
const conSaltos = (t: string) => t.replace(/([^\n])\n(?!\n)/g, '$1  \n')

/** Lo que Sophia pide, destacado: va justo encima de la caja de respuesta. */
const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max).trimEnd()}…` : t)

function Pedido({ texto }: { texto: string }) {
  return (
    <p className="mt-3 flex gap-2 font-semibold text-white">
      <span aria-hidden className="text-[#fbc50b]">→</span>
      <span><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...md, p: ({ children }) => <>{children}</> }}>{texto}</ReactMarkdown></span>
    </p>
  )
}

/** Los bloques que este mensaje muestra en la pizarra: tocar uno la trae a la vista. */
function VerEnLaPizarra({ contenido }: { contenido: string }) {
  const { blocksById, openBlock } = useMaterial()
  const bloques = citedBlocksInOrder(contenido).map((id) => blocksById.get(id)).filter((b) => !!b)
  if (!bloques.length) return null
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {bloques.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => openBlock(b.id)}
          className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 text-left text-[13px] text-[#e6edf1] hover:border-[#fbc50b]/60 hover:bg-white/[0.08]"
        >
          <Layers className="h-3.5 w-3.5 shrink-0 text-[#fbc50b]" aria-hidden />
          <span className="truncate"><span className="text-[#a9b8c2]">Ver en la pizarra: </span>{b.title}</span>
        </button>
      ))}
    </div>
  )
}

function MensajeDeSophia({
  mensaje,
  esElUltimo,
  ocupado,
  onChoose,
}: {
  mensaje: OptimisticMessage
  esElUltimo: boolean
  ocupado: boolean
  onChoose: (texto: string) => void
}) {
  const escribiendo = mensaje.status === 'streaming'
  if (mensaje.status === 'error') {
    return (
      <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#f5a3a3]">
        Hubo un problema al generar la respuesta. Escribe tu mensaje de nuevo para reintentar.
      </p>
    )
  }
  if (escribiendo && !mensaje.content.trim()) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-[#a9b8c2]" aria-live="polite">
        <Puntos /> Sophia está pensando…
      </div>
    )
  }
  const limpio = arreglarNegritas(stripMarkers(mensaje.content))
  const conOpciones = !escribiendo ? splitChoiceOptions(limpio) : { body: limpio, options: [], tail: '' }
  const hayOpciones = conOpciones.options.length > 0
  const { cuerpo, pedido } = esElUltimo && !escribiendo && !hayOpciones ? separarPedido(limpio) : { cuerpo: conOpciones.body, pedido: null }
  return (
    <div className="min-w-0 text-[16px] leading-relaxed text-[#e6edf1]">
        {cuerpo && <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{conSaltos(cuerpo)}</ReactMarkdown>}
        {escribiendo && (
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="ml-0.5 text-[#fbc50b]">▊</motion.span>
        )}
        {hayOpciones && (
          <>
            <ChoiceButtons options={conOpciones.options} onChoose={onChoose} disabled={ocupado || !esElUltimo} />
            {conOpciones.tail && (esElUltimo ? <Pedido texto={conOpciones.tail} /> : <p className="mt-2">{conOpciones.tail}</p>)}
          </>
        )}
        {pedido && <Pedido texto={pedido} />}
        {!escribiendo && <VerEnLaPizarra contenido={mensaje.content} />}
        {esElUltimo && !escribiendo && mensaje.content.length > 10 && (
          <div className="mt-1 -ml-2 text-[#7f909b]">
            <PlayAudioButton text={mensaje.content} className="text-[#7f909b] hover:text-white" />
          </div>
        )}
    </div>
  )
}

function Puntos() {
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay }}
          className="block h-2 w-2 rounded-full bg-[#fbc50b]"
        />
      ))}
    </span>
  )
}
