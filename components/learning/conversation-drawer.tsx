'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './chat-message'
import { motion, AnimatePresence } from 'framer-motion'
import type { OptimisticMessage } from '@/types/chat'

interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  messages: OptimisticMessage[]
}

export function ConversationDrawer({ open, onClose, messages }: ConversationDrawerProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [open, messages.length])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Conversación</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aún no hay mensajes en esta sesión.
                </p>
              ) : (
                messages.map((m, i) => (
                  <ChatMessage
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    timestamp={m.createdAt}
                    isLastMessage={i === messages.length - 1}
                    isStreaming={m.status === 'streaming' && m.content.length > 0}
                  />
                ))
              )}
              <div ref={endRef} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
