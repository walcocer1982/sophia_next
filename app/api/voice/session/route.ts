import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/voice/session
 *
 * Crea un token efímero del Realtime API de OpenAI en MODO TRANSCRIPCIÓN.
 *
 * NUEVA ARQUITECTURA (migración 2026-06-02):
 * - OpenAI Realtime solo TRANSCRIBE el audio del estudiante (oídos).
 * - NO genera respuesta — el cerebro es Claude, vía /api/chat/stream.
 * - La voz de Sophia se genera con /api/voice/speak (gpt-4o-mini-tts).
 *
 * Esto cumple con la intuición correcta del usuario: "Claude piensa,
 * OpenAI traduce y habla". La pedagogía (rubric, escalada, scaffolding,
 * cierre, turn-taking) aplica idéntico en texto y voz porque Claude
 * es el cerebro único en ambos.
 *
 * Ventajas vs el modo end-to-end anterior:
 * - 50-100× más barato (sin audio tokens caros del Realtime)
 * - Voz latinoamericana nativa (gpt-4o-mini-tts default)
 * - Pedagogía consistente texto/voz
 * - Sin auto-encadenamiento (gpt-realtime ya no es el cerebro)
 *
 * Trade-off: +1-1.5s de latencia por turno (vs ~500ms del end-to-end).
 * Para una clase tipo tutoría, es aceptable.
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

  // Validar que la sesión exista y pertenezca al usuario + traer el idioma
  // para la transcripción.
  const lessonSession = await prisma.lessonSession.findFirst({
    where: { id: sessionId, userId: session.userId },
    select: { id: true, language: true },
  })
  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const transcriptionLanguage = lessonSession.language === 'EN' ? 'en' : 'es'

  // Crear ephemeral client secret en modo TRANSCRIPCIÓN.
  // Doc: POST /v1/realtime/client_secrets con session.type='transcription'.
  // Modelo: gpt-realtime-whisper (streaming, low-latency).
  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: {
              model: 'gpt-realtime-whisper',
              // Idioma dinámico según la sesión (antes fijo en 'es').
              language: transcriptionLanguage,
              // NOTA: gpt-realtime-whisper NO soporta el parámetro 'prompt'
              // (vocabulario sesgado). Para corregir términos técnicos mal
              // transcritos se hace post-corrección con Claude (que sí tiene
              // el contexto de la lección), no aquí.
              // 'low' = balance entre latencia y precisión.
              delay: 'low',
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
    console.error('OpenAI Realtime transcription session error:', response.status, errorBody)
    return NextResponse.json(
      {
        error: 'Failed to create transcription session',
        openaiStatus: response.status,
        openaiDetail: errorBody.slice(0, 500),
      },
      { status: 500 },
    )
  }

  const data = await response.json()

  // Defensive unwrap del client_secret — la API puede devolver shapes distintos.
  let secretValue = ''
  if (typeof data.client_secret === 'string') {
    secretValue = data.client_secret
  } else if (data.client_secret && typeof data.client_secret === 'object') {
    secretValue = data.client_secret.value ?? ''
  } else if (typeof data.value === 'string') {
    secretValue = data.value
  }

  return NextResponse.json({
    client_secret: {
      value: secretValue,
      expires_at: data.expires_at ?? data.client_secret?.expires_at,
    },
    session_id: data.session?.id ?? data.id ?? null,
  })
}
