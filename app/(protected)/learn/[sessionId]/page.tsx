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
              id: true,
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

  // Extract per-activity images from contentJson (supports images[] and legacy image)
  const allImages = (contentJson?.activities || []).flatMap((a) => {
    const imgs = a.teaching?.images || (a.teaching?.image ? [a.teaching.image] : [])
    return imgs.filter((img) => img.url).map((img) => ({
      activityId: a.id,
      url: img.url,
      description: img.description,
      showWhen: img.showWhen || ('on_reference' as const),
    }))
  })
  const keyPoints = lessonSession.lesson.keyPoints || []

  // Extraer nombre del instructor del texto completo
  const instructorName = extractInstructorName(
    lessonSession.lesson.course?.instructor || ''
  )

  // Build test mode props if this is a test session
  const testMode = lessonSession.isTest && lessonSession.lesson.course
    ? {
        courseId: lessonSession.lesson.course.id,
        activities: (contentJson?.activities || []).map((a) => ({
          id: a.id,
          type: a.type,
          title: a.teaching.agent_instruction,
        })),
      }
    : undefined

  return (
    <LearningLayout
      sessionId={lessonSession.id}
      instructorName={instructorName}
      lessonTitle={lessonSession.lesson.title}
      objective={lessonSession.lesson.objective || ''}
      keyPoints={keyPoints}
      allImages={allImages}
      videoUrl={lessonSession.lesson.videoUrl}
      initialProgress={{
        current: completedCount + 1,
        total: totalActivities,
        percentage: Math.round((completedCount / totalActivities) * 100),
      }}
      testMode={testMode}
    >
      <ChatInterface
        sessionId={lessonSession.id}
        initialMessages={transformedMessages}
        lessonTitle={lessonSession.lesson.title}
      />
    </LearningLayout>
  )
}
