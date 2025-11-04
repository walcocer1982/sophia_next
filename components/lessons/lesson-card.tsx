import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

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
  return (
    <Link href={`/learn/${lesson.id}`}>
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02]">
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
          {lesson.estimatedMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimatedMinutes} minutos</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
