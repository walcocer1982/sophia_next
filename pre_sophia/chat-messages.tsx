'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarInstructor } from './avatar-instructor'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageWithImageRefs } from '@/components/MessageWithImageRefs'
import { cn } from '@/lib/utils'
import AITextLoading from '@/components/ui/text-loading'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SessionInfo {
  instructor: {
    name: string
    avatar?: string
    specialty?: string
  }
  user: {
    name: string
    avatar?: string
  }
  topic: {
    title: string
    description?: string
  }
  learningObjectives: string[]
  keyPoints: string[]
  activities: any[]
  progress: number
}

interface ChatMessagesProps {
  messages: Message[]
  loading: boolean
  sessionInfo: SessionInfo
  onImageRefClick: (imageTitle: string) => void
  onImageMentioned: (imageTitle: string) => void
}

/**
 * Skeleton loader para mostrar mientras el instructor genera la respuesta
 * Usa posicionamiento absoluto con máximo 40vh para evitar doble renderizado
 */
function MessageSkeleton({
  sessionInfo,
  fadeOut = false,
  isAbsolute = false
}: {
  sessionInfo: SessionInfo
  fadeOut?: boolean
  isAbsolute?: boolean
}) {

  const thinkingWords = [
    'pensando...',
    'analizando...',
    'generando respuesta...',
    'reflexionando...',
    'preparando contenido...'
  ]

  return (
    <div
      className={cn(
        "flex flex-col gap-4 animate-pulse transition-opacity duration-300",
        "min-h-[55vh] max-h-[55vh] sm:min-h-[40vh] sm:max-h-[40vh]",
        isAbsolute && "absolute inset-0 z-10 bg-transparent"
      )}
      style={{
        opacity: fadeOut ? 0 : 1
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="El instructor está pensando su respuesta"
    >
      <div className="flex flex-col gap-2 w-[90%] me-auto">
        <div className="flex gap-3 items-center">
          <AvatarInstructor
            name={sessionInfo.instructor.name}
            avatar={sessionInfo.instructor.avatar}
            state="thinking"
          />
          {/* Palabras animadas rotativas */}

          <AITextLoading texts={thinkingWords} />
        </div>
        <div className="flex-1 space-y-3 pt-2">
          {/* Líneas de skeleton con diferentes anchos para simular párrafos */}
          <div className={`h-4 rounded w-1/5 ${fadeOut ? 'bg-transparent' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-4 rounded w-2/5 ${fadeOut ? 'bg-transparent' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-4 rounded w-full ${fadeOut ? 'bg-transparent' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-4 rounded w-3/4 ${fadeOut ? 'bg-transparent' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-4 rounded w-5/6 ${fadeOut ? 'bg-transparent' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-4 rounded w-2/3 bg-gray-200 dark:bg-gray-700`}></div>
          <div className={`h-4 rounded w-full bg-gray-200 dark:bg-gray-700`}></div>
          <div className={`h-4 rounded w-5/6 bg-gray-200 dark:bg-gray-700`}></div>
          <div className={`h-4 rounded w-2/3 bg-gray-200 dark:bg-gray-700`}></div>
        </div>
      </div>
    </div>
  )
}

export function ChatMessages({
  messages,
  loading,
  sessionInfo,
  onImageRefClick,
  onImageMentioned
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const streamingWords = [
    'escribiendo...',
    'generando...',
    'perfeccionando...',
  ]

  // Scroll cuando cambian los mensajes o cuando empieza el loading
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  return (
    <ScrollArea className="flex-1 h-[70vh]">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {messages.map((msg, idx) => {
          // Detectar si es lastMessage:
          const isLastMessage = idx === messages.length - 1

          // Mensaje del Instructor (sin burbuja)
          if (msg.role === 'assistant') {
            // Para el último mensaje durante loading, usar wrapper con position relative
            const isStreamingLastMessage = isLastMessage && loading
            const hasContent = msg.content && msg.content.trim() !== ''

            // No mostrar mensajes vacios (zombie messages) - EXCEPTO si es el último durante loading
            if (!hasContent && !isStreamingLastMessage) {
              return null
            }

            return (
              <div
                key={idx}
                className="relative"
                style={{
                  // Reservar máximo 40vh para el área del mensaje
                  maxHeight: isLastMessage ? '40vh' : undefined,
                  minHeight: isLastMessage && (hasContent || loading) ? '40vh' : undefined,
                }}
              >
                {/* Contenedor del mensaje real */}
                <div
                  className={cn(
                    "flex flex-col gap-2 w-[90%] group me-auto",
                    // Transparente durante streaming para no mezclar con skeleton
                    isStreamingLastMessage && "bg-transparent"
                  )}
                  style={{
                    transition: 'min-height 0.3s ease-out, background-color 0.3s ease-out'
                  }}
                >
                  {/* Solo mostrar avatar si hay contenido (evitar duplicación con skeleton) */}
                  {hasContent && isLastMessage && (
                    <div className="flex gap-3 items-center">
                      <AvatarInstructor
                        name={sessionInfo.instructor.name}
                        avatar={sessionInfo.instructor.avatar}
                        state={isStreamingLastMessage ? "thinking" : "speaking"}
                      />
                      {/* Palabras animadas rotativas */}
                      {isStreamingLastMessage && (
                        <AITextLoading texts={streamingWords} />
                      )}
                    </div>

                  )}

                  {/* Contenido del mensaje */}
                  {hasContent && (
                    <div
                      className="flex-1 select-none"
                      onCopy={(e) => {
                        e.preventDefault()
                        console.log('[Security] Intento de copiar mensaje del instructor bloqueado')
                      }}
                      onCut={(e) => {
                        e.preventDefault()
                        console.log('[Security] Intento de cortar mensaje del instructor bloqueado')
                      }}
                    >
                      <MessageWithImageRefs
                        content={msg.content}
                        onImageClick={onImageRefClick}
                        onImageMentioned={onImageMentioned}
                        variant="plain"
                      />
                    </div>
                  )}

                  {/* Solo mostrar timestamp si hay contenido y no está loading */}
                  {hasContent && !isStreamingLastMessage && (
                    <span className={cn('text-xs text-gray-400 mt-0 block', (!isLastMessage) ? 'scale-0 group-hover:scale-100' : 'text-slate-500 pb-8')}>
                      {new Date(msg.timestamp).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>

                {/* Skeleton con posicionamiento absoluto durante loading */}
                {isStreamingLastMessage && (!hasContent || msg.content.length < 100) && (
                  <MessageSkeleton
                    sessionInfo={sessionInfo}
                    fadeOut={msg.content?.length > 10}
                    isAbsolute={true}
                  />
                )}
              </div>
            )
          }

          // Mensaje del Estudiante (con burbuja blanca)
          return (
            <div key={idx} className="flex gap-2 justify-end items-center max-w-4xl ml-auto mb-6 group">
              <div className='flex flex-col gap-2'>
                <div className="bg-white border border-slate-300 px-5 py-3 rounded-3xl rounded-br-none max-w-xl">
                  <div className="text-gray-800 text-base whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-right scale-0 group-hover:scale-100">
                  {new Date(msg.timestamp).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={sessionInfo.user.avatar || undefined} alt={sessionInfo.user.name || 'Usuario'} />
                <AvatarFallback className="bg-slate-300 text-gray-700 text-sm">
                  {sessionInfo.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
