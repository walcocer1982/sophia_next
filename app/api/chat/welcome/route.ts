import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { AI_CONFIG } from '@/lib/ai-config'
import { logger } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { getFirstActivity } from '@/lib/lesson-parser'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import type { LessonContent } from '@/types/lesson'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const runtime = 'nodejs'

/**
 * POST /api/chat/welcome
 * Genera mensaje de bienvenida con streaming para una sesión de lección
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 })
    }

    // Get lesson info
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      include: {
        lesson: {
          select: {
            id: true, // Necesario para getLessonContent
            title: true,
            description: true,
          },
        },
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }

    // Obtener contenido de la lección (desde archivo hardcodeado o DB)
    const contentJson = await getLessonContent(lessonSession.lesson.id) as LessonContent

    if (!contentJson) {
      return new Response('Lesson content not found', { status: 404 })
    }

    // Obtener primera actividad con contexto completo
    const firstActivityContext = getFirstActivity(contentJson)

    if (!firstActivityContext) {
      return new Response('No activities found in lesson', { status: 500 })
    }

    // Usar el sistema de prompts completo para contexto pedagógico
    const systemPrompt = buildSystemPrompt({
      activityContext: firstActivityContext,
      tangentCount: 0,
    })

    // Construir tabla de objetivos desde TODAS las actividades de la lección
    const objectives = contentJson.moments.flatMap(moment =>
      moment.activities.map(act => act.teaching.main_topic)
    )

    const objectivesTable = [
      '| # | Objetivo |',
      '|---|---|',
      ...objectives.map((obj, idx) => `| ${idx + 1} | ${obj} |`)
    ].join('\n')

    // Instrucción especial para mensaje de bienvenida proactivo
    const welcomeInstruction = `ESTE ES EL PRIMER MENSAJE DE LA LECCIÓN.

Tu objetivo ahora es dar una bienvenida cálida y COMENZAR A ENSEÑAR INMEDIATAMENTE.

Estructura tu mensaje OBLIGATORIAMENTE así:

1. Saludo amigable y enlace directo a los objetivos de la la clase.

2. TABLA DE OBJETIVOS DE LA CLASE (copiar exactamente como está):
${objectivesTable}

3. Explicar porqué es importante iniciar esta clase con ${firstActivityContext.activity.teaching.key_points[0]}

4. Pregunta de engagement incial. DEBE SER CONCISA Y DIRECTA.

Importante:
- La tabla debe aparecer SIEMPRE.
- Tono conversacional y cercano
- SÉ PROACTIVO, no esperes a que el estudiante pregunte

Genera el mensaje de bienvenida ahora.`

    // Stream response from Claude con contexto pedagógico completo
    const stream = await anthropic.messages.stream({
      model: AI_CONFIG.models.welcome,
      max_tokens: AI_CONFIG.tokens.welcome,
      system: systemPrompt,
      messages: [{ role: 'user', content: welcomeInstruction }],
    })

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              fullContent += text
              controller.enqueue(encoder.encode(text))
            }
          }

          // Get final message data
          const finalMessage = await stream.finalMessage()
          inputTokens = finalMessage.usage.input_tokens
          outputTokens = finalMessage.usage.output_tokens

          // Check if welcome message already exists (idempotency)
          const existingWelcome = await prisma.message.findFirst({
            where: {
              sessionId,
              role: 'assistant',
            },
            select: { id: true },
          })

          if (existingWelcome) {
            logger.warn('chat.welcome.already_exists', {
              sessionId,
              userId: session.user?.id,
            })
            controller.close()
            return
          }

          // Save to DB after streaming completes (only if doesn't exist)
          await prisma.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullContent,
              inputTokens,
              outputTokens,
            },
          })

          logger.info('chat.welcome.generated', {
            sessionId,
            userId: session.user?.id,
            inputTokens,
            outputTokens,
          })

          controller.close()
        } catch (error) {
          logger.error('chat.welcome.error', {
            sessionId,
            userId: session.user?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('chat.welcome.request.error', {
      userId: session?.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response('Internal server error', { status: 500 })
  }
}
