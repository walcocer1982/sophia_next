import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/learning/chat-interface'
import { LearningLayout } from '@/components/learning/learning-layout'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { LessonContent } from '@/types/lesson'

/**
 * Extrae el nombre del instructor del texto de personalidad
 * Ej: "Eres el Ingeniero Carlos, un experto..." → "Ingeniero Carlos"
 */
function extractInstructorName(instructorText: string): string {
  const patterns = [
    /Eres (?:el |la )?([^,.\n]+)/i,  // "Eres el Ingeniero Carlos"
    /Soy (?:el |la )?([^,.\n]+)/i,   // "Soy el Ingeniero Carlos"
    /^([A-Z][a-záéíóú]+ [A-Z][a-záéíóú]+)/,  // "Ingeniero Carlos" al inicio
  ]

  for (const pattern of patterns) {
    const match = instructorText.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return 'Instructor AI'
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { sessionId } = await params

  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    include: {
      lesson: {
        include: {
          course: {
            select: {
              instructor: true,
            },
          },
        },
      },
      messages: {
        orderBy: { timestamp: 'asc' },
      },
      activities: {
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!lessonSession) {
    notFound()
  }

  // Parse lesson content
  const contentJson = lessonSession.lesson.contentJson as LessonContent | null
  const totalActivities = contentJson?.activities?.length || 1
  const completedCount = await prisma.activityProgress.count({
    where: { lessonSessionId: sessionId },
  })

  // Transform messages to match ChatMessage type
  const transformedMessages = lessonSession.messages.map((msg) => ({
    id: msg.id,
    sessionId: msg.sessionId,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    createdAt: msg.timestamp,
  }))

  // Extract per-activity images from contentJson
  const allImages = (contentJson?.activities || [])
    .filter((a) => a.teaching?.image)
    .map((a) => ({
      activityId: a.id,
      url: a.teaching.image!.url,
      description: a.teaching.image!.description,
      showWhen: a.teaching.image!.showWhen || ('on_reference' as const),
    }))
  const keyPoints = lessonSession.lesson.keyPoints || []

  // Extraer nombre del instructor del texto completo
  const instructorName = extractInstructorName(
    lessonSession.lesson.course?.instructor || ''
  )

  return (
    <LearningLayout
      sessionId={lessonSession.id}
      instructorName={instructorName}
      lessonTitle={lessonSession.lesson.title}
      objective={lessonSession.lesson.objective || ''}
      keyPoints={keyPoints}
      allImages={allImages}
      initialProgress={{
        current: completedCount + 1,
        total: totalActivities,
        percentage: Math.round((completedCount / totalActivities) * 100),
      }}
    >
      <ChatInterface
        sessionId={lessonSession.id}
        initialMessages={transformedMessages}
        lessonTitle={lessonSession.lesson.title}
      />
    </LearningLayout>
  )
}
