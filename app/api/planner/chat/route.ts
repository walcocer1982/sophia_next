import { auth } from '@/auth'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { PlannerChatRequestSchema, GeneratedStructureSchema } from '@/lib/planner/validation'
import { buildPlannerSystemPrompt } from '@/lib/planner/conversational-prompts'
import { PLANNER_STEPS } from '@/types/planner'
import type { PlannerStep, PlannerData } from '@/types/planner'

export const runtime = 'nodejs'
export const maxDuration = 60

// Marcador que la IA usa para enviar datos al panel
const PANEL_DATA_START = '---PANEL_DATA---'
const PANEL_DATA_END = '---END_PANEL_DATA---'

function extractPanelData(
  fullResponse: string
): { cleanText: string; updates: Array<{ field: keyof PlannerData; value: unknown }> } {
  const updates: Array<{ field: keyof PlannerData; value: unknown }> = []
  let cleanText = fullResponse

  // Extraer todos los bloques PANEL_DATA
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
          field: parsed.field as keyof PlannerData,
          value: parsed.value,
        })
      }
    } catch {
      // JSON inválido, ignorar
    }
    cleanText = cleanText.replace(match[0], '')
  }

  return { cleanText: cleanText.trim(), updates }
}

function shouldAdvanceStep(
  step: PlannerStep,
  updates: Array<{ field: keyof PlannerData; value: unknown }>,
  hasCourseContext: boolean
): PlannerStep | null {
  // Si hay un panel_update que corresponde al step actual, avanzar
  const fieldForStep: Record<PlannerStep, keyof PlannerData> = {
    TEMA: 'tema',
    OBJETIVO: 'objetivo',
    INSTRUCCIONES: 'instrucciones',
    KEY_POINTS: 'keyPoints',
    CONTENIDO: 'contenidoTecnico',
    ESTRUCTURA: 'activities',
  }

  const expectedField = fieldForStep[step]
  const hasUpdate = updates.some((u) => u.field === expectedField)

  if (hasUpdate) {
    const currentIndex = PLANNER_STEPS.indexOf(step)
    if (currentIndex < PLANNER_STEPS.length - 1) {
      let nextIndex = currentIndex + 1
      // Skip TEMA and OBJETIVO when courseContext is provided (already defined from course)
      while (
        hasCourseContext &&
        nextIndex < PLANNER_STEPS.length &&
        (PLANNER_STEPS[nextIndex] === 'TEMA' || PLANNER_STEPS[nextIndex] === 'OBJETIVO')
      ) {
        nextIndex++
      }
      if (nextIndex < PLANNER_STEPS.length) {
        return PLANNER_STEPS[nextIndex]
      }
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

  const parseResult = PlannerChatRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parseResult.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { message, step, plannerData, courseContext, history } = parseResult.data
  const systemPrompt = buildPlannerSystemPrompt(step, plannerData, courseContext)

  // Construir mensajes para Claude
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  // Agregar historial reciente (últimos 10 pares)
  const recentHistory = history.slice(-10)
  for (const msg of recentHistory) {
    claudeMessages.push({ role: msg.role, content: msg.content })
  }

  // Agregar mensaje actual
  let userContent: string
  if (message === '__INIT__') {
    userContent = courseContext
      ? `Quiero diseñar la sesión "${courseContext.lessonTitle}" del curso "${courseContext.courseTitle}". El objetivo es: ${courseContext.lessonObjective}. Propón las instrucciones de enseñanza.`
      : 'Hola, quiero crear una nueva clase.'
  } else if (message === '__STEP_TRANSITION__') {
    // IMPORTANT: These messages must NOT trigger PANEL_DATA emission.
    // The AI must only PROPOSE and wait for instructor confirmation.
    const stepPrompts: Record<string, string> = {
      OBJETIVO: '[TRANSICIÓN DE SISTEMA] El paso anterior fue completado. Ahora PROPONE el objetivo de aprendizaje. SOLO PROPONE — NO incluyas PANEL_DATA. Espera la confirmación del instructor.',
      INSTRUCCIONES: courseContext
        ? '[TRANSICIÓN DE SISTEMA] El tema y objetivo ya están definidos desde el curso. Ahora PROPONE las instrucciones de enseñanza. SOLO PROPONE — NO incluyas PANEL_DATA. Espera la confirmación del instructor.'
        : '[TRANSICIÓN DE SISTEMA] El paso anterior fue completado. Ahora PROPONE las instrucciones de enseñanza. SOLO PROPONE — NO incluyas PANEL_DATA. Espera la confirmación del instructor.',
      KEY_POINTS: '[TRANSICIÓN DE SISTEMA] El paso anterior fue completado. Ahora PROPONE los puntos clave de la sesión. SOLO PROPONE — NO incluyas PANEL_DATA. Espera la confirmación del instructor.',
      CONTENIDO: '[TRANSICIÓN DE SISTEMA] El paso anterior fue completado. Ahora PROPONE el contenido técnico para TODOS los puntos clave. SOLO PROPONE — NO incluyas PANEL_DATA. Espera la confirmación del instructor.',
      ESTRUCTURA: '[TRANSICIÓN DE SISTEMA] El paso anterior fue completado. Ahora genera la estructura de actividades completa con PANEL_DATA.',
    }
    userContent = stepPrompts[step] || 'Continuemos con el siguiente paso.'
  } else {
    userContent = message
  }
  claudeMessages.push({ role: 'user', content: userContent })

  const maxTokens = step === 'ESTRUCTURA' ? 8192 : 2048
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: maxTokens,
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

            // Check if PANEL_DATA marker has appeared
            const panelStart = fullResponse.indexOf(PANEL_DATA_START)

            if (panelStart >= 0) {
              // Send any text before the marker that hasn't been sent yet
              if (lastSentIndex < panelStart) {
                const textToSend = fullResponse.substring(lastSentIndex, panelStart)
                if (textToSend) {
                  const data = JSON.stringify({ type: 'content', text: textToSend })
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                }
                lastSentIndex = panelStart
              }
              // Don't send anything from the marker onwards
            } else {
              // No marker yet — buffer last N chars to avoid sending partial markers
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

        // Flush any remaining buffered text (if no PANEL_DATA was found)
        if (fullResponse.indexOf(PANEL_DATA_START) === -1 && lastSentIndex < fullResponse.length) {
          const textToSend = fullResponse.substring(lastSentIndex)
          if (textToSend.trim()) {
            const data = JSON.stringify({ type: 'content', text: textToSend })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        // Post-stream: extraer datos del panel
        const { updates } = extractPanelData(fullResponse)
        console.log('[PLANNER] Step:', step, '| Updates extracted:', updates.length, '| Fields:', updates.map(u => u.field).join(', '))
        if (updates.length === 0 && step === 'ESTRUCTURA') {
          // Debug: check if PANEL_DATA markers exist in response
          const hasStart = fullResponse.includes(PANEL_DATA_START)
          const hasEnd = fullResponse.includes(PANEL_DATA_END)
          console.log('[PLANNER] ESTRUCTURA debug: hasStart=', hasStart, 'hasEnd=', hasEnd)
          if (hasStart) {
            const startIdx = fullResponse.indexOf(PANEL_DATA_START)
            const snippet = fullResponse.substring(startIdx, startIdx + 200)
            console.log('[PLANNER] PANEL_DATA snippet:', snippet)
          }
        }

        // Emitir panel_update events
        for (const update of updates) {
          // Validar actividades si es el campo activities
          if (update.field === 'activities') {
            const validation = GeneratedStructureSchema.safeParse({
              activities: update.value,
            })
            if (!validation.success) {
              console.error('[PLANNER] Activity validation FAILED:', JSON.stringify(validation.error.flatten()))
              continue
            }
            console.log('[PLANNER] Activities validated OK:', (validation.data.activities as unknown[]).length, 'activities')
            update.value = validation.data.activities
          }

          const panelData = JSON.stringify({
            type: 'panel_update',
            field: update.field,
            value: update.value,
          })
          controller.enqueue(encoder.encode(`data: ${panelData}\n\n`))
        }

        // Determinar si avanzar paso
        const nextStep = shouldAdvanceStep(step, updates, !!courseContext)
        if (nextStep) {
          const stepData = JSON.stringify({
            type: 'step_change',
            newStep: nextStep,
          })
          controller.enqueue(encoder.encode(`data: ${stepData}\n\n`))
        }

        // Done
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        console.error('Planner chat error:', error)
        try {
          const errorData = JSON.stringify({
            type: 'error',
            message: 'Error al generar respuesta',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        } catch {
          // Controller already closed, ignore
        }
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
