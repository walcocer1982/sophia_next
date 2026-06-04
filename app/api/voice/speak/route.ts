import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/voice/speak
 *
 * Text-to-Speech con gpt-4o-mini-tts de OpenAI.
 * Recibe texto de Claude (response de chat/stream) y devuelve audio
 * streaming en español latinoamericano.
 *
 * Parte de la nueva arquitectura: Whisper (modo transcription-only del
 * Realtime API) → Claude → este endpoint TTS. Claude es el cerebro,
 * OpenAI solo "oye y habla".
 *
 * Configuración:
 * - Modelo: gpt-4o-mini-tts (más barato y steerable)
 * - Voz: 'coral' (cálida, funciona bien en español latino)
 * - Formato: opus (low-latency streaming, formato compacto)
 * - Instrucciones: español latinoamericano, tono amigable, ritmo conversacional
 *
 * Pricing aprox: $0.015/min de audio generado (vs $64/1M tokens del
 * Realtime audio output — ~50× más barato).
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

  const body = await request.json().catch(() => null)
  if (!body || typeof body.text !== 'string' || !body.text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const text = body.text.trim().slice(0, 4000) // cap defensivo
  // Idioma para steering del TTS. coral soporta ambos nativos. Antes esto
  // estaba hardcoded a ES — causa por la que Pilar escuchó "Perfecto" cuando
  // el texto decía "Perfect": el TTS leyó inglés con fonética española.
  const lang: 'ES' | 'EN' = body.language === 'EN' ? 'EN' : 'ES'

  const voiceInstructions = lang === 'EN'
    ? 'Speak in clear, neutral American English with a warm, friendly, conversational tone. ' +
      'Natural pace, not too slow, not too fast. Clear pronunciation, like an instructor ' +
      'explaining something to a student. NO Spanish accent. Pronounce English words naturally.'
    : 'Habla en español latinoamericano natural, con tono cálido y conversacional, ' +
      'a un ritmo natural (ni muy lento ni muy rápido). Pronunciación clara y amigable, ' +
      'como una instructora explicando algo a un estudiante. Sin acento neutro ni gringo.'

  // Llamar a OpenAI TTS con streaming activado (chunk transfer encoding).
  // El cliente recibe el audio en chunks y puede empezar a reproducir antes
  // de que termine de generarse.
  const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      instructions: voiceInstructions,
      // opus = formato moderno comprimido, ideal para streaming de baja latencia
      response_format: 'opus',
    }),
  })

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text()
    console.error('OpenAI TTS error:', openaiResponse.status, errorBody)
    return NextResponse.json(
      {
        error: 'TTS failed',
        openaiStatus: openaiResponse.status,
        openaiDetail: errorBody.slice(0, 500),
      },
      { status: 500 },
    )
  }

  // Stream el audio del proveedor al cliente sin buffering intermedio.
  // El cliente ve llegar bytes a medida que OpenAI los genera.
  return new Response(openaiResponse.body, {
    headers: {
      'Content-Type': 'audio/ogg; codecs=opus',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
