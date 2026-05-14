'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SophiaAvatar } from './sophia-avatar'
import { VoiceButton } from './voice-button'
import { ConversationDrawer } from './conversation-drawer'
import { ChatInput, type ChatInputRef } from './chat-input'
import { PlayAudioButton } from './play-audio-button'
import type { OptimisticMessage } from '@/types/chat'
import { useRef } from 'react'

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

interface TutorModeProps {
  sessionId: string
  lessonTitle: string
  messages: OptimisticMessage[]
  onAddMessage: (msg: OptimisticMessage) => void
  onUpdateMessage: (id: string, updater: (m: OptimisticMessage) => OptimisticMessage) => void
  onSendText: (text: string) => Promise<void>
  isLoading: boolean
  isGeneratingWelcome: boolean
  autoStartVoice?: boolean
  headerExtra?: React.ReactNode // Extra content for the header (e.g., "Terminar" button)
}

export function TutorMode({
  sessionId,
  lessonTitle,
  messages,
  onAddMessage,
  onUpdateMessage,
  onSendText,
  isLoading,
  isGeneratingWelcome,
  autoStartVoice = false,
  headerExtra,
}: TutorModeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [showTextInput, setShowTextInput] = useState(false)
  const chatInputRef = useRef<ChatInputRef>(null)

  // Last assistant message (currently visible bubble)
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 relative">
      {/* Header */}
      <div className="shrink-0 border-b bg-white px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-gray-800 truncate">{lessonTitle}</h1>
        {headerExtra}
      </div>

      {/* Main: Avatar + Last message */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 overflow-hidden">
        {/* Avatar - responsive: smaller on mobile, larger on desktop */}
        <div className="hidden lg:block">
          <SophiaAvatar state={avatarState} size={360} />
        </div>
        <div className="hidden md:block lg:hidden">
          <SophiaAvatar state={avatarState} size={300} />
        </div>
        <div className="md:hidden">
          <SophiaAvatar state={avatarState} size={240} />
        </div>

        {/* Last message bubble */}
        <AnimatePresence mode="wait">
          {isGeneratingWelcome && !lastAssistantMessage?.content ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl w-full bg-white rounded-2xl shadow-md p-4 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    className="block w-2 h-2 rounded-full bg-blue-400"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                    className="block w-2 h-2 rounded-full bg-blue-400"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                    className="block w-2 h-2 rounded-full bg-blue-400"
                  />
                </div>
                <span className="text-sm text-gray-500">Sophia se está preparando...</span>
              </div>
            </motion.div>
          ) : lastAssistantMessage && lastAssistantMessage.content ? (
            <motion.div
              key={lastAssistantMessage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl w-full bg-white rounded-2xl shadow-md p-4 sm:p-5"
            >
              <p className="text-base sm:text-lg text-gray-800 leading-relaxed">
                {lastAssistantMessage.content}
                {lastAssistantMessage.status === 'streaming' && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block ml-1"
                  >
                    ▊
                  </motion.span>
                )}
              </p>
              {/* Play audio button - only show for completed messages (not while streaming) */}
              {lastAssistantMessage.status !== 'streaming' && lastAssistantMessage.content.length > 10 && (
                <div className="mt-2 flex justify-end">
                  <PlayAudioButton text={lastAssistantMessage.content} />
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* History link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="text-gray-500 gap-1.5"
        >
          <MessageSquare className="h-4 w-4" />
          Ver conversación ({messages.length} mensajes)
        </Button>
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t bg-white p-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <VoiceButton
            sessionId={sessionId}
            autoStart={autoStartVoice}
            onMessage={onAddMessage}
            onStreamStart={(id) => {
              setAvatarState('speaking')
              onAddMessage({
                id,
                sessionId,
                role: 'assistant',
                content: '',
                createdAt: new Date(),
                status: 'streaming',
                isOptimistic: true,
              })
            }}
            onStreamDelta={(id, delta) => {
              onUpdateMessage(id, (m) => ({ ...m, content: m.content + delta }))
            }}
            onStreamDone={(id) => {
              setAvatarState('idle')
              onUpdateMessage(id, (m) => ({ ...m, status: 'completed', isOptimistic: false }))
            }}
            disabled={isLoading || isGeneratingWelcome}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTextInput(v => !v)}
            className="gap-1.5"
          >
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">{showTextInput ? 'Ocultar texto' : 'Escribir'}</span>
          </Button>
        </div>

        {/* Text input (collapsible) */}
        <AnimatePresence>
          {showTextInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2"
            >
              <ChatInput
                ref={chatInputRef}
                onSend={onSendText}
                disabled={isLoading || isGeneratingWelcome}
                isGeneratingWelcome={isGeneratingWelcome}
                isThinking={isLoading}
                isStreaming={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Drawer */}
      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        messages={messages}
      />
    </div>
  )
}
