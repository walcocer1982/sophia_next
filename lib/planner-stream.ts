import type { PlannerStreamEvent } from '@/types/planner'

/**
 * Generic SSE stream handler for both course and session planners.
 *
 * @param endpoint - API URL (default: '/api/planner/chat')
 * @param dataKey  - Key name for the data payload ('plannerData' | 'courseData')
 * @param signal   - AbortSignal to cancel the stream
 */
export async function streamPlannerResponse(
  message: string,
  step: string,
  data: Record<string, unknown>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (text: string) => void,
  onPanelUpdate: (field: string, value: unknown) => void,
  onStepChange: (newStep: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  endpoint: string = '/api/planner/chat',
  dataKey: string = 'plannerData',
  extraBody?: Record<string, unknown>,
  signal?: AbortSignal
) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, step, [dataKey]: data, history, ...extraBody }),
      credentials: 'include',
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { error?: string }).error ||
          `HTTP error: ${response.status}`
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6)) as PlannerStreamEvent

            if (parsed.type === 'content' && parsed.text) {
              onChunk(parsed.text)
            } else if (
              parsed.type === 'panel_update' &&
              parsed.field &&
              parsed.value !== undefined
            ) {
              onPanelUpdate(parsed.field, parsed.value)
            } else if (parsed.type === 'step_change' && parsed.newStep) {
              onStepChange(parsed.newStep)
            } else if (parsed.type === 'done') {
              onDone()
              return
            } else if (parsed.type === 'error') {
              onError(new Error(parsed.message || 'Unknown error'))
              return
            }
          } catch {
            continue
          }
        }
      }
    }

    onDone()
  } catch (error) {
    // Don't report abort as error
    if ((error as Error).name === 'AbortError') {
      onDone()
      return
    }
    onError(error as Error)
  }
}
