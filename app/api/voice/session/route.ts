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

  // Create ephemeral client secret via OpenAI Realtime API.
  // Doc: POST /v1/realtime/client_secrets (renamed from /v1/realtime/sessions).
  // Config nested under "session"; audio nested under session.audio.{input,output}.
  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        // GA alias 'gpt-realtime' — mejor instrucciones y menor falso-positivo
        // en content_filter para español que el snapshot anterior.
        model: 'gpt-realtime',
        instructions,
        // 'audio' es lo que importa para voz; el SDK del cliente expone el
        // transcript igual desde los eventos de Realtime.
        output_modalities: ['audio'],
        max_output_tokens: 'inf',
        audio: {
          output: {
            // 'shimmer' es la voz femenina más neutra / amigable para latinos.
            voice: 'shimmer',
          },
          input: {
            transcription: {
              model: 'whisper-1',
              language: 'es',
              // Prompt corto a propósito: prompts largos se alucinan verbatim
              // en audios cortos/silenciosos. Solo pistas de vocabulario.
              prompt: 'Minería, jumbo, desatado, flotación, lixiviación.',
            },
            // Push-to-talk: el cliente controla cuándo enviar el audio.
            turn_detection: null,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenAI Realtime session error:', response.status, errorBody)
    // Devolvemos el detalle (status + cuerpo truncado) para diagnosticar desde
    // el cliente sin tener que ir a logs de Vercel. NO se filtra el API key.
    return NextResponse.json(
      {
        error: 'Failed to create voice session',
        openaiStatus: response.status,
        openaiDetail: errorBody.slice(0, 500),
      },
      { status: 500 },
    )
  }

  const data = await response.json()
  // Diagnóstico temporal: shape del response (claves de nivel superior y tipo
  // de client_secret). NO loguea el token mismo. Quitar tras confirmar el shape.
  console.log('[voice/session] OpenAI response shape:', {
    topLevelKeys: Object.keys(data),
    clientSecretType: typeof data.client_secret,
    clientSecretIsObject: data.client_secret && typeof data.client_secret === 'object',
    clientSecretKeys:
      data.client_secret && typeof data.client_secret === 'object'
        ? Object.keys(data.client_secret)
        : null,
    hasTopLevelValue: 'value' in data,
  })

  // El cliente (use-voice-chat) espera client_secret.value (objeto). La API
  // nueva puede devolver: (1) string "ek_..." al top-level, (2) objeto
  // { value, expires_at }, o (3) el response entero ES el secret y tiene .value.
  let secretValue = ''
  if (typeof data.client_secret === 'string') {
    secretValue = data.client_secret
  } else if (data.client_secret && typeof data.client_secret === 'object') {
    secretValue = data.client_secret.value ?? ''
  } else if (typeof data.value === 'string') {
    // Caso: el response entero ES el client secret (sin wrapper).
    secretValue = data.value
  }

  return NextResponse.json({
    client_secret: { value: secretValue, expires_at: data.expires_at ?? data.client_secret?.expires_at },
    session_id: data.session?.id ?? data.id ?? null,
  })
}
