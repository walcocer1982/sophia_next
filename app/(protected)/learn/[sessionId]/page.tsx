import { auth } from '@/auth'
import { tituloActividad } from '@/lib/actividad-titulo'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/learning/chat-interface'
import { LearningLayout } from '@/components/learning/learning-layout'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { LessonContent } from '@/types/lesson'
import { allLessonBlocks } from '@/lib/support-blocks'


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
              voiceEnabled: true,
              allowPaste: true,
              allowImagePaste: true,
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

  // Material de apoyo de toda la lección (bloques + imágenes viejas convertidas).
  // Las imágenes sin validar solo se ven en sesiones de prueba.
  const allBlocks = allLessonBlocks(contentJson, lessonSession.isTest)
  const activityOrder = (contentJson?.activities || []).map((a) => a.id)
  const keyPoints = lessonSession.lesson.keyPoints || []

  // Build test mode props if this is a test session
  const testMode = lessonSession.isTest && lessonSession.lesson.course
    ? {
        courseId: lessonSession.lesson.course.id,
        activities: (contentJson?.activities || []).map((a, i) => ({
          id: a.id,
          type: a.type,
          title: tituloActividad(a, i),
        })),
      }
    : undefined

  return (
    <LearningLayout
      sessionId={lessonSession.id}
      lessonTitle={lessonSession.lesson.title}
      objective={lessonSession.lesson.objective || ''}
      keyPoints={keyPoints}
      allBlocks={allBlocks}
      activityOrder={activityOrder}
      initialActivityId={lessonSession.activityId ?? activityOrder[0] ?? null}
      isTest={lessonSession.isTest}
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
        voiceEnabled={lessonSession.lesson.course?.voiceEnabled ?? true}
        allowPaste={
          session.user.role === 'ADMIN' ||
          session.user.role === 'SUPERADMIN' ||
          session.user.role === 'INSTRUCTOR' ||
          lessonSession.isTest === true ||
          lessonSession.lesson.course?.allowPaste === true
        }
        allowAttachments={lessonSession.lesson.course?.allowImagePaste === true}
      />
    </LearningLayout>
  )
}
