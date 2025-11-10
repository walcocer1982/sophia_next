'use client'

import { AvatarInstructor } from '@/components/learning/avatar-instructor'
import AITextLoading from '@/components/ui/text-loading'

interface ChatMessageSkeletonProps {
  isWelcome?: boolean
}

export function ChatMessageSkeleton({ isWelcome = false }: ChatMessageSkeletonProps) {
  const texts = isWelcome
    ? ['Iniciando la lección...', 'Preparando contenido...', 'Configurando actividades...']
    : ['Analizando', 'Pensando', 'Procesando', 'Comparando']

  return (
    <div className="flex flex-col gap-2 group animate-in fade-in duration-300">
      {/* Avatar + Skeleton Lines */}
      <div className="flex flex-col gap-2 items-start">
        {/* Avatar en estado "thinking" */}
        <div className="flex gap-3 items-center">
          <AvatarInstructor name="Sophia" state="thinking" />
          <div className="bg-transparent">
            <AITextLoading texts={texts} interval={1000} />
          </div>
        </div>
        

        {/* Skeleton Lines Container */}
        <div className="w-full max-w-[70%] space-y-2.5 mt-1">
          {/* Línea 1: Full width */}
          <div className="h-5 bg-slate-400/20 dark:bg-gray-700 rounded-md animate-pulse"></div>

          {/* Línea 2: 75% width */}
          <div className="h-5 bg-slate-400/30 dark:bg-gray-700 rounded-md animate-pulse w-3/4" />

          {/* Línea 3: 50% width */}
          <div className="h-5 bg-slate-400/40 dark:bg-gray-700 rounded-md animate-pulse w-1/2" />

          {/* Línea 4: 75% width */}
          <div className="h-5 bg-slate-400/50 dark:bg-gray-700 rounded-md animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  )
}
