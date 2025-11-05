'use client'

import { ArrowUp } from 'lucide-react'
import { debugLog } from '@/lib/debug-utils'
// import { VoiceButton } from './voice-button'

interface ChatInputProps {
  input: string
  loading: boolean
  isRecording: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onToggleVoice: () => void
  isModalOpen: boolean
  onModalClose: () => void
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

export function ChatInput({
  input,
  loading,
  isRecording,
  onInputChange,
  onSend,
  // onToggleVoice,
  isModalOpen,
  onModalClose,
  textareaRef
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onInputChange(newValue)

    // Auto-cerrar modal de imagen cuando el estudiante empieza a escribir
    if (isModalOpen && newValue.length > input.length) {
      onModalClose()
    }

    // Auto-expandir hasta 4 lineas, luego scroll
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    // Permitir paste si la variable de entorno está activada
    const allowPaste = process.env.ALLOW_PASTE_INPUT === 'true' || process.env.ALLOW_PASTE_INPUT === '1'

    if (allowPaste) {
      debugLog('SECURITY', 'Paste permitido (ALLOW_PASTE_INPUT activado)')
      return // Permitir el comportamiento por defecto del paste
    }

    // Bloquear paste por defecto
    e.preventDefault()
    debugLog('SECURITY', 'Intento de pegar bloqueado - usa tus propias palabras o el microfono')
  }

  return (
    <div className="bg-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 text-red-600 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span className="font-medium">Grabando... Habla con claridad (se detendrá automáticamente)</span>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            placeholder="Escribe aquí..."
            className="w-full px-4 py-4 font-sans pr-24 border bg-white border-slate-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-transparent resize-none text-xl transition-all"
            style={{
              minHeight: '120px',
              maxHeight: '120px',
              overflowY: 'auto',
              scrollbarWidth: 'thin'
            }}
            rows={1}
            disabled={loading}
          />

          <div className="absolute bottom-6 right-4 flex items-center gap-1 bg-transparent">
            {/* Voice Button Component */}
            {/* <VoiceButton
              isRecording={isRecording}
              loading={loading}
              onToggle={onToggleVoice}
            /> */}

            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              className={`p-2 rounded-full transition-all ${
                input.trim() && !loading
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
            {/* Usa el microfono o escribe  •  */}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">Shift + Enter</kbd> saltar línea
            • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono text-[10px]">Enter</kbd> para enviar
          </span>
        </div>
      </div>
    </div>
  )
}
