'use client'

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  KeyboardEvent,
  ChangeEvent,
  ClipboardEvent
} from 'react'
import { ArrowUp, Square, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PlannerAttachment } from '@/types/planner'

interface ChatInputProps {
  onSend: (message: string, attachments?: PlannerAttachment[]) => void
  onStop?: () => void
  disabled?: boolean
  placeholder?: string
  isGeneratingWelcome?: boolean
  isThinking?: boolean
  isStreaming?: boolean
  /** Audio TTS is currently playing — show "Sophia está hablando..." */
  isSpeaking?: boolean
  /**
   * When true, paste is allowed regardless of the global env var
   * NEXT_PUBLIC_ALLOW_PASTE_INPUT. Set to true for admin/instructor
   * surfaces (planner chat, test sessions) where the paste-blocker is
   * an anti-cheat measure that shouldn't apply.
   */
  allowPaste?: boolean
  /** When true, shows the attach-file button (planner surfaces only). */
  allowAttachments?: boolean
  /**
   * Visual theme. 'light' (default) for /learn flow on light backgrounds;
   * 'dark' for kiosko on dark glass background — adapts wrapper, textarea,
   * focus ring, send button and kbd hints to the dark theme.
   */
  variant?: 'light' | 'dark'
}

// Imágenes y PDF (bloques nativos de Claude). Word/Excel quedan deshabilitados
// hasta poder instalar mammoth/xlsx en este entorno — ver lib/planner/attachments.ts.
const ATTACH_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf'
const MAX_ATTACHMENTS = 3
const MAX_FILE_BYTES = 9 * 1024 * 1024 // ~9MB (límite base64 del schema)

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export interface ChatInputRef {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ onSend, onStop, disabled, placeholder, isGeneratingWelcome, isThinking, isStreaming, isSpeaking, allowPaste, allowAttachments, variant = 'light' }, ref) => {
  const isDark = variant === 'dark'
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<PlannerAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }), [])

  // Auto-foco cuando el input vuelve a estar habilitado (Sophia terminó de
  // responder, error de envío, etc.). Evita depender de un setTimeout externo
  // y cubre todos los paths (onDone, onError, abort).
  const prevDisabledRef = useRef<boolean>(!!disabled)
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      // requestAnimationFrame asegura que el DOM ya reflejó disabled=false
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
    prevDisabledRef.current = !!disabled
  }, [disabled])

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSend(message.trim(), attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
      // Reset altura del textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // permite re-seleccionar el mismo archivo
    if (picked.length === 0) return

    const room = MAX_ATTACHMENTS - attachments.length
    if (room <= 0) {
      toast.error(`Máximo ${MAX_ATTACHMENTS} archivos`)
      return
    }

    const next: PlannerAttachment[] = []
    for (const file of picked.slice(0, room)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`"${file.name}" supera 9MB`)
        continue
      }
      try {
        next.push({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: await readAsBase64(file),
        })
      } catch {
        toast.error(`No se pudo leer "${file.name}"`)
      }
    }
    if (next.length > 0) setAttachments((prev) => [...prev, ...next])
  }

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
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
    // Admin/instructor surfaces explicitly allow paste (planner, test sessions).
    if (allowPaste) {
      return
    }
    // Otherwise honor the global env-var override.
    const envAllowPaste =
      process.env.NEXT_PUBLIC_ALLOW_PASTE_INPUT === 'true' ||
      process.env.NEXT_PUBLIC_ALLOW_PASTE_INPUT === '1'
    if (envAllowPaste) {
      return
    }
    // Student default: paste blocked (anti-cheat in learn flows).
    e.preventDefault()
    console.log('[SECURITY] Intento de pegar bloqueado - usa tus propias palabras')
  }

  // Determinar placeholder según estado con mejor feedback.
  // Priority: welcome > speaking (audio) > thinking > streaming > custom > default.
  const effectivePlaceholder = isGeneratingWelcome
    ? 'Esperando mensaje de bienvenida...'
    : isSpeaking
    ? 'Sophia está hablando...'
    : isThinking
    ? 'Sophia está pensando...'
    : isStreaming
    ? 'Sophia está escribiendo...'
    : placeholder || 'Escribe tu mensaje...'

  const hasContent = message.trim() || attachments.length > 0
  const canSend = hasContent && !disabled

  return (
    <div className={isDark ? '' : 'bg-slate-300 p-4'}>
      <div className={isDark ? '' : 'max-w-4xl mx-auto'}>
        {allowAttachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span
                key={`${a.name}-${i}`}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                  isDark
                    ? 'bg-white/10 border border-white/15 text-slate-200'
                    : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                <Paperclip className={`h-3 w-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                <span className="max-w-[180px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className={`ml-0.5 ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                  title="Quitar"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={effectivePlaceholder}
            className={`w-full px-5 py-4 font-sans pr-16 border rounded-2xl focus:outline-none resize-none text-base leading-relaxed transition-all ${
              isDark
                ? 'bg-white/5 backdrop-blur text-white border-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50 disabled:opacity-60'
                : 'bg-white border-slate-300 focus:ring-2 focus:ring-slate-600 focus:border-transparent'
            } ${allowAttachments ? 'pl-14' : ''}`}
            style={{
              minHeight: isDark ? '92px' : '80px',
              maxHeight: isDark ? '180px' : '120px',
              overflowY: 'auto',
              scrollbarWidth: 'thin'
            }}
            rows={1}
            disabled={disabled}
          />

          {allowAttachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACH_ACCEPT}
                onChange={handleFilesSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
                className={`absolute bottom-3 left-3 p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title="Adjuntar archivo (imagen o PDF)"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-transparent">
            {isStreaming && onStop ? (
              <button
                onClick={onStop}
                className={`p-2.5 rounded-full transition-all ${
                  isDark
                    ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-md'
                }`}
                title="Detener generación"
                type="button"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={disabled || !hasContent}
                className={`p-2.5 rounded-full transition-all ${
                  canSend
                    ? isDark
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50'
                      : 'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-md'
                    : isDark
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-300 text-white cursor-not-allowed opacity-60'
                }`}
                title="Enviar mensaje"
                type="button"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className={`mt-2 flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <span>
            <kbd className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
              isDark ? 'bg-white/10 border-white/15 text-slate-300' : 'bg-slate-200 border-slate-400'
            }`}>
              Shift + Enter
            </kbd>{' '}
            saltar línea •{' '}
            <kbd className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
              isDark ? 'bg-white/10 border-white/15 text-slate-300' : 'bg-slate-200 border-slate-400'
            }`}>
              Enter
            </kbd>{' '}
            para enviar
          </span>
        </div>
      </div>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'
