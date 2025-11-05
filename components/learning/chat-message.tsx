import { cn } from '@/lib/utils'
import type { MessageRole } from '@/types/chat'

interface ChatMessageProps {
  role: MessageRole
  content: string
  timestamp?: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'

  // Format timestamp consistently for SSR hydration
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('es-PE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-blue-500' : 'bg-purple-500'
        )}
      >
        <span className="text-white font-semibold">
          {isUser ? 'U' : 'IA'}
        </span>
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'rounded-lg px-4 py-3 max-w-[70%]',
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {formattedTime && (
          <span
            className={cn(
              'text-xs mt-1 block',
              isUser ? 'text-blue-100' : 'text-gray-500'
            )}
          >
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  )
}
