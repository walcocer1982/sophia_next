'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { BookOpen, Loader2, CheckCircle2, Play, Lock, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface LessonCardProps {
  lesson: {
    id: string
    title: string
    slug: string
    keyPoints: string[]
    order: number
    course: {
      title: string
      slug: string
    }
    isAvailable?: boolean
    isClosed?: boolean
    availableAt?: string | null
    closesAt?: string | null
  }
  status?: 'completed' | 'in_progress' | 'not_started'
}

export function LessonCard({ lesson, status }: LessonCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const isAvailable = lesson.isAvailable !== false
  const isClosed = lesson.isClosed === true
  const isScheduled = !isAvailable && !isClosed && lesson.availableAt

  const handleStartLesson = async () => {
    if (isClosed) {
      toast.info('Esta sesión ya se cerró')
      return
    }
    if (!isAvailable) {
      toast.info('Esta lección aún no está disponible')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403 && errorData.message) {
          toast.error(errorData.message)
          setTimeout(() => {
            router.push('/api/auth/signout')
          }, 2000)
          return
        }
        throw new Error(errorData.error || 'Failed to start session')
      }

      const data = await response.json()
      router.push(`/learn/${data.sessionId}`)
    } catch (error) {
      console.error('Error starting lesson:', error)
      toast.error('Error al iniciar la lección. Intenta de nuevo.')
      setIsLoading(false)
    }
  }

  return (
    <Card
      className={`h-full transition-all ${
        isAvailable && !isClosed
          ? 'hover:scale-[1.02] cursor-pointer'
          : 'opacity-70 cursor-not-allowed'
      }`}
      onClick={handleStartLesson}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          {isAvailable ? (
            <BookOpen className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4 text-gray-400" />
          )}
          <span>Lección {lesson.order}</span>
        </div>
        <CardTitle className={`mb-3 ${!isAvailable ? 'text-gray-400' : ''}`}>
          {lesson.title}
        </CardTitle>
        {lesson.keyPoints.length > 0 && (
          <CardDescription className="mb-4">
            <ul className="list-disc list-inside space-y-1">
              {lesson.keyPoints.slice(0, 3).map((point, index) => (
                <li key={index} className="text-sm line-clamp-1">
                  {point}
                </li>
              ))}
            </ul>
          </CardDescription>
        )}
        <div className="flex items-center justify-between">
          {isClosed && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-500">
              <Lock className="h-3.5 w-3.5" />
              Sesión cerrada
            </span>
          )}
          {isScheduled && lesson.availableAt && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Clock className="h-3.5 w-3.5" />
              Disponible: {new Date(lesson.availableAt).toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'short',
              })}{', '}{new Date(lesson.availableAt).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
          {!isScheduled && !isAvailable && (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
              <Lock className="h-3.5 w-3.5" />
              No disponible
            </span>
          )}
          {isAvailable && status === 'completed' && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completada
            </span>
          )}
          {isAvailable && status === 'in_progress' && (
            <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
              <Play className="h-3.5 w-3.5" />
              En progreso
            </span>
          )}
          {isAvailable && (!status || status === 'not_started') && <span />}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
