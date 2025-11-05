'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LessonCardProps {
  lesson: {
    id: string
    title: string
    description: string | null
    slug: string
    category: string | null
    estimatedMinutes: number | null
    difficulty: string | null
  }
}

export function LessonCard({ lesson }: LessonCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartLesson = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id }),
        credentials: 'include', // Include cookies for authentication
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403 && errorData.message) {
          // Invalid session - user needs to re-authenticate
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
      className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
      onClick={handleStartLesson}
    >
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          {lesson.category && (
            <Badge variant="secondary">{lesson.category}</Badge>
          )}
          {lesson.difficulty && (
            <Badge variant="outline">{lesson.difficulty}</Badge>
          )}
        </div>
        <CardTitle className="mb-2">{lesson.title}</CardTitle>
        <CardDescription className="mb-4 line-clamp-2">
          {lesson.description}
        </CardDescription>
        <div className="flex items-center justify-between">
          {lesson.estimatedMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimatedMinutes} minutos</span>
            </div>
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
