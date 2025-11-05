'use client'

import { useState, useRef, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      // Reset altura del textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setMessage(newValue)

    // Auto-expandir hasta 4 lineas (120px), luego scroll
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Permitir paste si la variable de entorno está activada
    const allowPaste =
      process.env.NEXT_PUBLIC_ALLOW_PASTE_INPUT === 'true' ||
      process.env.NEXT_PUBLIC_ALLOW_PASTE_INPUT === '1'

    if (allowPaste) {
      return // Permitir el comportamiento por defecto del paste
    }

    // Bloquear paste por defecto
    e.preventDefault()
    console.log('[SECURITY] Intento de pegar bloqueado - usa tus propias palabras')
  }

  return (
    <div className="bg-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder || 'Escribe aquí...'}
            className="w-full px-4 py-4 font-sans pr-16 border bg-white border-slate-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-transparent resize-none text-base transition-all"
            style={{
              minHeight: '60px',
              maxHeight: '120px',
              overflowY: 'auto',
              scrollbarWidth: 'thin'
            }}
            rows={1}
            disabled={disabled}
          />

          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-transparent">
            <button
              onClick={handleSend}
              disabled={disabled || !message.trim()}
              className={`p-2 rounded-full transition-all ${
                message.trim() && !disabled
                  ? 'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-md'
                  : 'bg-slate-300 text-white cursor-not-allowed opacity-60'
              }`}
              title="Enviar mensaje"
              type="button"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">
              Shift + Enter
            </kbd>{' '}
            saltar línea •{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            para enviar
          </span>
        </div>
      </div>
    </div>
  )
}
