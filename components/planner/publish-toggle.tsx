'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface PublishToggleProps {
  lessonId: string
  initialPublished: boolean
}

export function PublishToggle({ lessonId, initialPublished }: PublishToggleProps) {
  const [isPublished, setIsPublished] = useState(initialPublished)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publish: !isPublished }),
      })
      if (res.ok) {
        setIsPublished(!isPublished)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`gap-1.5 ${isPublished ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPublished ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
      {isPublished ? 'Publicada' : 'Publicar'}
    </Button>
  )
}
