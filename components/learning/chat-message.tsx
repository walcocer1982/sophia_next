import { memo } from 'react'
import { cn } from '@/lib/utils'
import { AvatarInstructor } from '@/components/learning/avatar-instructor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MessageRole } from '@/types/chat'
import AITextLoading from '@/components/ui/text-loading'

interface ChatMessageProps {
  role: MessageRole
  content: string
  timestamp?: Date
  isLastMessage?: boolean
  isStreaming?: boolean
  isError?: boolean
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  timestamp,
  isLastMessage,
  isStreaming = false,
  isError = false,
}: ChatMessageProps) {
  const isUser = role === 'user'

  // Format timestamp consistently for SSR hydration
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : '';

  if (isUser) {
    return (
      <div className='flex flex-col gap-2 group'>
        <div className='flex flex-row-reverse gap-3'>
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-slate-300">
            <span className="text-white font-semibold">U</span>
          </div>

          <div className='flex flex-col gap-1 max-w-[70%] group'>
            <div className='px-4 py-3 rounded-2xl border border-slate-500 text-slate-800 bg-white rounded-br-none'>
              <p className="whitespace-pre-wrap">{content}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-right scale-0 group-hover:scale-100">
          {formattedTime}
        </div>
      </div>
    )
  }


  // AI - estado de error: mostrar burbuja visible en vez de un mensaje vacío
  // (antes un stream fallido se renderizaba en blanco → parecía "no avanza").
  if (isError) {
    return (
      <div className='flex flex-col gap-2'>
        <div className='flex gap-3 items-start'>
          <AvatarInstructor name="Sophia" state="idle" />
          <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {content?.trim() || 'No se pudo generar la respuesta. Intenta enviar tu mensaje de nuevo.'}
          </div>
        </div>
      </div>
    )
  }

  // AI:
  return (
    <div className='flex flex-col gap-2 group'>
      <div className='flex flex-col gap-2'>
        {isLastMessage && isStreaming ? (
          <div className="flex gap-3 items-center">
            <AvatarInstructor name="Sophia" state="speaking" />
            <div className="bg-transparent">
              <AITextLoading texts={['Generando', 'Escrbiendo', 'Profundizando', 'Puliendo']} interval={1000} color='green' />
            </div>
          </div>
        ) : (
          <AvatarInstructor name="Sophia" state={'idle'} />
        )
        }
        <div className="inline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="leading-7 mb-1.5 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              hr: () => <hr className="my-2 border-gray-300" />,
              ul: ({ children }) => <ul className="list-disc list-inside my-1.5 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside my-1.5 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      <div className={cn('text-xs text-gray-500 text-left', !isLastMessage && 'scale-0 group-hover:scale-100')}>
        {formattedTime}
      </div>
    </div>
  )

})
