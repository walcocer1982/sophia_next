import { auth } from '@/auth'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { imageUrl } = (await request.json()) as { imageUrl?: string }
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
  }

  try {
    // Download image and convert to base64
    const imgResponse = await fetch(imageUrl)
    if (!imgResponse.ok) {
      return NextResponse.json({ error: 'No se pudo descargar la imagen' }, { status: 400 })
    }

    const arrayBuffer = await imgResponse.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.startsWith('image/')
      ? (contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')
      : 'image/jpeg'

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Describe el contenido de esta imagen en 1-2 oraciones en español. Sé específico (diagramas, personas, objetos, texto visible). NUNCA empieces con "La imagen muestra" ni "Se observa" — ve directo al contenido. Ejemplo: "Pirámide invertida con 5 niveles de controles de riesgo, desde eliminación hasta EPP." Solo responde con la descripción.',
            },
          ],
        },
      ],
    })

    const description =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ description })
  } catch (error) {
    console.error('Error describing image:', error)
    return NextResponse.json(
      { error: 'Error al describir imagen' },
      { status: 500 }
    )
  }
}
