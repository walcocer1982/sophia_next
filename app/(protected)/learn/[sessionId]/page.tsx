import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/learning/chat-interface'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

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
        select: {
          title: true,
        },
      },
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  })

  if (!lessonSession) {
    notFound()
  }

  // Transform messages to match ChatMessage type
  const transformedMessages = lessonSession.messages.map((msg) => ({
    id: msg.id,
    sessionId: msg.sessionId,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    createdAt: msg.timestamp,
  }))

  return (
    <ChatInterface
      sessionId={lessonSession.id}
      initialMessages={transformedMessages}
      lessonTitle={lessonSession.lesson.title}
    />
  )
}
