import { cn } from '@/lib/utils'
import { AvatarInstructor } from './avatar-instructor'
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
      {isUser ? (
        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-500">
          <span className="text-white font-semibold">U</span>
        </div>
      ) : (
        <AvatarInstructor name="Sophia" state="idle" />
      )}

      {/* Message content - bubble solo para usuario */}
      <div
        className={cn(
          'px-4 py-3 max-w-[70%]',
          isUser && 'rounded-lg bg-blue-500 text-white'
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
