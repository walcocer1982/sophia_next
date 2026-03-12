import { auth } from '@/auth'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { CoursePlannerChatRequestSchema } from '@/lib/planner/validation'
import { buildCoursePlannerSystemPrompt } from '@/lib/planner/course-prompts'
import { COURSE_PLANNER_STEPS } from '@/types/planner'
import type { CoursePlannerStep, CoursePlannerData } from '@/types/planner'

export const runtime = 'nodejs'
export const maxDuration = 60

const PANEL_DATA_START = '---PANEL_DATA---'
const PANEL_DATA_END = '---END_PANEL_DATA---'

function extractPanelData(
  fullResponse: string
): { updates: Array<{ field: keyof CoursePlannerData; value: unknown }> } {
  const updates: Array<{ field: keyof CoursePlannerData; value: unknown }> = []

  const regex = new RegExp(
    `${PANEL_DATA_START}\\s*([\\s\\S]*?)\\s*${PANEL_DATA_END}`,
    'g'
  )

  let match
  while ((match = regex.exec(fullResponse)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed.field && parsed.value !== undefined) {
        updates.push({
          field: parsed.field as keyof CoursePlannerData,
          value: parsed.value,
        })
      }
    } catch {
      // JSON inválido, ignorar
    }
  }

  return { updates }
}

function shouldAdvanceStep(
  step: CoursePlannerStep,
  updates: Array<{ field: keyof CoursePlannerData; value: unknown }>
): CoursePlannerStep | null {
  const fieldForStep: Record<CoursePlannerStep, keyof CoursePlannerData> = {
    CURSO: 'titulo',
    CAPACIDAD: 'capacidad',
    APRENDIZAJES: 'aprendizajes',
    TEMAS: 'temas',
  }

  const expectedField = fieldForStep[step]
  const hasUpdate = updates.some((u) => u.field === expectedField)

  if (hasUpdate) {
    const currentIndex = COURSE_PLANNER_STEPS.indexOf(step)
    if (currentIndex < COURSE_PLANNER_STEPS.length - 1) {
      return COURSE_PLANNER_STEPS[currentIndex + 1]
    }
  }

  return null
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }
  const role = session.user.role || 'STUDENT'
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const parseResult = CoursePlannerChatRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parseResult.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { message, step, courseData, history } = parseResult.data
  const systemPrompt = buildCoursePlannerSystemPrompt(step, courseData)

  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  const recentHistory = history.slice(-10)
  for (const msg of recentHistory) {
    claudeMessages.push({ role: msg.role, content: msg.content })
  }

  let userContent: string
  if (message === '__INIT__') {
    userContent = 'Hola, quiero crear un nuevo curso.'
  } else if (message === '__STEP_TRANSITION__') {
    const stepPrompts: Record<string, string> = {
      CAPACIDAD: '[TRANSICIÓN DE SISTEMA] Paso completado. Ahora PROPÓN directamente la capacidad general del curso. NO hagas preguntas previas — propón UNA capacidad y espera confirmación.',
      APRENDIZAJES: '[TRANSICIÓN DE SISTEMA] Paso completado. Ahora PROPÓN directamente los aprendizajes esperados del curso. NO hagas preguntas — propón la lista completa.',
      TEMAS: '[TRANSICIÓN DE SISTEMA] Paso completado. Ahora GENERA directamente los temas/sesiones a partir de los aprendizajes.',
    }
    userContent = stepPrompts[step] || 'Continuemos con el siguiente paso.'
  } else {
    userContent = message
  }
  claudeMessages.push({ role: 'user', content: userContent })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: claudeMessages,
        })

        let fullResponse = ''
        let lastSentIndex = 0
        const markerLen = PANEL_DATA_START.length

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullResponse += event.delta.text

            const panelStart = fullResponse.indexOf(PANEL_DATA_START)

            if (panelStart >= 0) {
              if (lastSentIndex < panelStart) {
                const textToSend = fullResponse.substring(lastSentIndex, panelStart)
                if (textToSend) {
                  const data = JSON.stringify({ type: 'content', text: textToSend })
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                }
                lastSentIndex = panelStart
              }
            } else {
              const safeEnd = Math.max(lastSentIndex, fullResponse.length - markerLen)
              if (safeEnd > lastSentIndex) {
                const textToSend = fullResponse.substring(lastSentIndex, safeEnd)
                const data = JSON.stringify({ type: 'content', text: textToSend })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                lastSentIndex = safeEnd
              }
            }
          }
        }

        // Flush remaining buffered text if no PANEL_DATA found
        if (fullResponse.indexOf(PANEL_DATA_START) === -1 && lastSentIndex < fullResponse.length) {
          const textToSend = fullResponse.substring(lastSentIndex)
          if (textToSend.trim()) {
            const data = JSON.stringify({ type: 'content', text: textToSend })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        // Extract panel updates
        const { updates } = extractPanelData(fullResponse)

        for (const update of updates) {
          const panelData = JSON.stringify({
            type: 'panel_update',
            field: update.field,
            value: update.value,
          })
          controller.enqueue(encoder.encode(`data: ${panelData}\n\n`))
        }

        // Determine step advancement
        const nextStep = shouldAdvanceStep(step, updates)
        if (nextStep) {
          const stepData = JSON.stringify({
            type: 'step_change',
            newStep: nextStep,
          })
          controller.enqueue(encoder.encode(`data: ${stepData}\n\n`))
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        console.error('Course planner chat error:', error)
        const errorData = JSON.stringify({
          type: 'error',
          message: 'Error al generar respuesta',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
