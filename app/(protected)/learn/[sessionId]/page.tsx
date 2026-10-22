import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/learning/chat-interface'
import { LearningLayout } from '@/components/learning/learning-layout'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { LessonContent } from '@/types/lesson'
import { allLessonBlocks, panelInfo } from '@/lib/support-blocks'
import { PARAM_VISTA, esVistaEstudiante } from '@/lib/vista-estudiante'
import { nombreDeActividad } from '@/lib/planner/titulos'
import { ocultarClaves } from '@/lib/subrayado'
import { cierreParaAlumno } from '@/lib/ventana-alumno'
import { formatDateLong, formatTime } from '@/lib/formatters'
import Link from 'next/link'


export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  // Ventana cerrada (15 oct 2026). Antes el Monitor marcaba `endedAt` a las
  // 24 h sin actividad y el chat devolvía 404 sin explicación; ahora nadie
  // cierra sesiones por inactividad y es la ventana de la sección la que
  // decide, como en la lista de clases y en /api/session/start.
  if (!lessonSession.isTest && !lessonSession.completedAt) {
    // Misma función que el chat: el cierre del instructor también cuenta.
    const cierre = await cierreParaAlumno(session.user.id, {
      id: lessonSession.lessonId,
      courseId: lessonSession.lesson.courseId,
      availableAt: lessonSession.lesson.availableAt,
      closesAfterHours: lessonSession.lesson.closesAfterHours,
    })
    if (cierre && cierre < new Date()) {
      return (
        <div className="mx-auto max-w-lg p-8">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">Esta sesión ya se cerró</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              «{lessonSession.lesson.title}» cerró el {formatDateLong(cierre)} a las {formatTime(cierre)}.
              Lo que avanzaste quedó guardado.
            </p>
            <Link
              href="/lessons"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
            >
              Volver a mis clases
            </Link>
          </div>
        </div>
      )
    }
  }

  // «Probar como estudiante» (lib/vista-estudiante.ts): solo en sesiones de
  // prueba. Con esto, la pantalla sigue las reglas del curso y no las del
  // instructor: material sin validar oculto, pegar texto según el curso, sin
  // herramientas de desarrollo y con la franja de prueba reducida.
  const comoEstudiante = lessonSession.isTest && esVistaEstudiante((await searchParams)[PARAM_VISTA])
  const verSinValidar = lessonSession.isTest && !comoEstudiante

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
    activityId: msg.activityId,
    material: msg.material,
  }))

  // Material de apoyo de toda la lección (bloques + imágenes viejas convertidas).
  // Las imágenes sin validar solo se ven en sesiones de prueba.
  // Sin `lineasClave`: el navegador no debe saber qué línea respalda la respuesta.
  const allBlocks = ocultarClaves(allLessonBlocks(contentJson, verSinValidar))
  const activityOrder = (contentJson?.activities || []).map((a) => a.id)
  const keyPoints = lessonSession.lesson.keyPoints || []

  // Build test mode props if this is a test session
  const testMode = lessonSession.isTest && lessonSession.lesson.course
    ? {
        courseId: lessonSession.lesson.course.id,
        comoEstudiante,
        activities: (contentJson?.activities || []).map((a, i) => ({
          id: a.id,
          type: a.type,
          title: nombreDeActividad(a, i),
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
      activityInfo={panelInfo(contentJson)}
      isTest={verSinValidar}
      initialActivityId={lessonSession.activityId ?? activityOrder[0] ?? null}
      initialProgress={{
        current: completedCount + 1,
        total: totalActivities,
        percentage: Math.round((completedCount / totalActivities) * 100),
        completedAt: lessonSession.completedAt?.toISOString() ?? null,
      }}
      testMode={testMode}
    >
      <ChatInterface
        sessionId={lessonSession.id}
        initialMessages={transformedMessages}
        lessonTitle={lessonSession.lesson.title}
        objective={lessonSession.lesson.objective || ''}
        keyPoints={keyPoints}
        actividades={(contentJson?.activities || []).map((a, i) => ({
          id: a.id,
          titulo: nombreDeActividad(a, i),
          subtitulo: a.subtitle,
        }))}
        exitHref={testMode ? `/planner/${testMode.courseId}` : '/lessons'}
        exitLabel={testMode ? 'Volver al curso' : 'Volver a mis lecciones'}
        // Prueba cerrada por «Probar», «Reiniciar» o «Ir a actividad» (21 oct 2026):
        // se puede releer, pero el chat ya no acepta mensajes.
        pruebaCerrada={lessonSession.isTest && !!lessonSession.endedAt}
        voiceEnabled={lessonSession.lesson.course?.voiceEnabled ?? true}
        allowPaste={
          lessonSession.lesson.course?.allowPaste === true ||
          (!comoEstudiante &&
            (session.user.role === 'ADMIN' ||
              session.user.role === 'SUPERADMIN' ||
              session.user.role === 'INSTRUCTOR' ||
              lessonSession.isTest === true))
        }
        comoEstudiante={comoEstudiante}
        allowAttachments={lessonSession.lesson.course?.allowImagePaste === true}
      />
    </LearningLayout>
  )
}
