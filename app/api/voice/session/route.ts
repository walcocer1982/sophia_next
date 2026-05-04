import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { buildVoiceInstructions } from '@/lib/voice-prompt'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/voice/session
 * Creates an ephemeral token for the OpenAI Realtime API.
 * The token is short-lived (1 minute) and tied to a specific session/lesson.
 * Client uses this token to connect via WebRTC directly to OpenAI.
 */
export async function POST(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  // Get lesson context for the voice instructions
  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: session.userId },
    include: {
      lesson: true,
      activities: { where: { status: 'IN_PROGRESS' }, take: 1 },
    },
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const currentActivityId = lessonSession.activities[0]?.activityId || null
  const instructions = buildVoiceInstructions({
    lessonTitle: lessonSession.lesson.title,
    lessonObjective: lessonSession.lesson.objective,
    contentJson: lessonSession.lesson.contentJson as unknown as LessonContent,
    currentActivityId,
  })

  // Create ephemeral token via OpenAI Realtime API
  // Docs: https://platform.openai.com/docs/api-reference/realtime-sessions
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Use latest GA model 'gpt-realtime' which has better instruction following
      // and reduced false-positive content_filter for non-English (Spanish)
      model: 'gpt-realtime',
      // 'shimmer' is the most neutral/Latin-friendly female voice
      voice: 'shimmer',
      modalities: ['text', 'audio'],
      instructions,
      // Allow longer responses (default is 4096, "inf" lets model finish naturally)
      max_response_output_tokens: 'inf',
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'es', // Force Spanish transcription
        // Prompt helps Whisper focus on the lesson topic and reduces hallucinations
        prompt: `Transcripción de un estudiante hablando en español sobre ${lessonSession.lesson.title}. Contexto educativo de procesos metalúrgicos y minería.`,
      },
      // Push-to-talk: client manually controls when to commit audio
      turn_detection: null,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI Realtime session error:', error)
    return NextResponse.json({ error: 'Failed to create voice session' }, { status: 500 })
  }

  const data = await response.json()
  return NextResponse.json({
    client_secret: data.client_secret,
    session_id: data.id,
  })
}
