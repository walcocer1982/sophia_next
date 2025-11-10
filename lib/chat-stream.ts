export interface StreamEvent {
  type: 'content' | 'done' | 'error' | 'activity_completed'
  text?: string
  message?: string
  // Activity completion data
  activityId?: string
  activityTitle?: string
  nextActivityId?: string | null
  nextActivityTitle?: string | null
  isLastActivity?: boolean
  currentPosition?: number
  completedCount?: number
  total?: number
  percentage?: number
  completedAt?: string
}

export interface ActivityProgressEvent {
  activityId: string
  activityTitle: string
  nextActivityId: string | null
  nextActivityTitle: string | null
  isLastActivity: boolean
  currentPosition: number
  completedCount: number
  total: number
  percentage: number
  completedAt?: string
}

export async function streamChatResponse(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  onActivityCompleted?: (data: ActivityProgressEvent) => void
) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: StreamEvent = JSON.parse(line.slice(6))

            if (data.type === 'content' && data.text) {
              onChunk(data.text)
            } else if (data.type === 'activity_completed' && onActivityCompleted) {
              // Handle activity completion event
              const progressData: ActivityProgressEvent = {
                activityId: data.activityId!,
                activityTitle: data.activityTitle!,
                nextActivityId: data.nextActivityId!,
                nextActivityTitle: data.nextActivityTitle!,
                isLastActivity: data.isLastActivity!,
                currentPosition: data.currentPosition!,
                completedCount: data.completedCount!,
                total: data.total!,
                percentage: data.percentage!,
                completedAt: data.completedAt,
              }
              onActivityCompleted(progressData)
            } else if (data.type === 'done') {
              onDone()
              return
            } else if (data.type === 'error') {
              onError(new Error(data.message || 'Unknown error'))
              return
            }
          } catch (e) {
            // Skip invalid JSON
            continue
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error)
  }
}
