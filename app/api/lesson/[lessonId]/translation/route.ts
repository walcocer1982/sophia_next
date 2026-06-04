import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'
export const maxDuration = 30 // Haiku translation can take a few seconds

/**
 * GET /api/lesson/[lessonId]/translation?language=EN
 *
 * Devuelve la traducción cacheada del contenido estático de una lección
 * (title, objective, keyPoints, descripciones de imágenes). Si no existe
 * en DB, Haiku la genera y se guarda. Subsecuentes llamadas leen del cache.
 *
 * Endpoint público — el contenido de una lección no es sensible, y el
 * visitante del kiosko todavía no tiene cookie de sesión cuando elige EN
 * en el toggle (antes de presionar Comenzar).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params
  const { searchParams } = new URL(request.url)
  const language = searchParams.get('language')

  if (language !== 'ES' && language !== 'EN') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  // ES no necesita traducción — devolvemos el contenido original
  if (language === 'ES') {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { title: true, objective: true, keyPoints: true, contentJson: true },
    })
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    const images = extractImageDescriptions(lesson.contentJson as unknown as LessonContent)
    return NextResponse.json({
      title: lesson.title,
      objective: lesson.objective,
      keyPoints: lesson.keyPoints,
      imageDescriptions: images,
      cached: true,
    })
  }

  // EN: buscar en cache
  const cached = await prisma.lessonContentTranslation.findUnique({
    where: { lessonId_language: { lessonId, language: 'EN' } },
  })

  if (cached) {
    return NextResponse.json({
      title: cached.title,
      objective: cached.objective,
      keyPoints: cached.keyPoints,
      imageDescriptions: cached.imageDescriptions,
      cached: true,
    })
  }

  // No cache → traducir con Haiku y guardar
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true, objective: true, keyPoints: true, contentJson: true },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const images = extractImageDescriptions(lesson.contentJson as unknown as LessonContent)

  try {
    const translated = await translateLessonContent({
      title: lesson.title,
      objective: lesson.objective,
      keyPoints: lesson.keyPoints,
      imageDescriptions: images,
    })

    // Persistir para próximas llamadas
    await prisma.lessonContentTranslation.create({
      data: {
        lessonId,
        language: 'EN',
        title: translated.title,
        objective: translated.objective,
        keyPoints: translated.keyPoints,
        imageDescriptions: translated.imageDescriptions as object,
      },
    })

    logger.info('lesson_translation.generated', {
      lessonId,
      language: 'EN',
      keyPointCount: translated.keyPoints.length,
      imageCount: translated.imageDescriptions.length,
    })

    return NextResponse.json({
      ...translated,
      cached: false,
    })
  } catch (err: unknown) {
    logger.error('lesson_translation.error', {
      lessonId,
      error: err instanceof Error ? err.message : String(err),
    })
    // Fallback: devolver el original sin traducir
    return NextResponse.json(
      {
        title: lesson.title,
        objective: lesson.objective,
        keyPoints: lesson.keyPoints,
        imageDescriptions: images,
        cached: false,
        error: 'translation_failed',
      },
      { status: 200 } // 200 con fallback en vez de 500 para no romper el kiosko
    )
  }
}

interface ImageDescription {
  url: string
  description: string
}

interface TranslatedContent {
  title: string
  objective: string
  keyPoints: string[]
  imageDescriptions: ImageDescription[]
}

function extractImageDescriptions(content: LessonContent | null): ImageDescription[] {
  if (!content?.activities) return []
  const out: ImageDescription[] = []
  for (const act of content.activities) {
    const imgs = act.teaching?.images || (act.teaching?.image ? [act.teaching.image] : [])
    for (const img of imgs) {
      if (img.url && img.description) {
        out.push({ url: img.url, description: img.description })
      }
    }
  }
  return out
}

async function translateLessonContent(input: TranslatedContent): Promise<TranslatedContent> {
  const prompt = `Translate the following lesson content from Spanish to natural English.
Preserve technical accuracy and the original meaning. Return ONLY valid JSON, no commentary.

Input (Spanish):
${JSON.stringify(input, null, 2)}

Return JSON with this EXACT structure (translated to English):
{
  "title": "...",
  "objective": "...",
  "keyPoints": ["...", "..."],
  "imageDescriptions": [{"url": "...", "description": "..."}]
}

Rules:
- Keep the same number of keyPoints and imageDescriptions
- Preserve image URLs unchanged
- Translate technical terms naturally (e.g., "perforación" → "drilling", "voladura" → "blasting")
- Keep proper nouns as-is (e.g., names of techniques specific to mining)
- Output JSON only — no markdown fences, no explanations.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Limpiar fences si Haiku los puso
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()

  const parsed = JSON.parse(cleaned) as TranslatedContent

  // Validación mínima — si keyPoints o imageDescriptions están mal, fallback
  if (!Array.isArray(parsed.keyPoints) || !Array.isArray(parsed.imageDescriptions)) {
    throw new Error('Invalid translation structure')
  }
  if (parsed.keyPoints.length !== input.keyPoints.length) {
    throw new Error('keyPoints length mismatch')
  }
  if (parsed.imageDescriptions.length !== input.imageDescriptions.length) {
    throw new Error('imageDescriptions length mismatch')
  }

  return parsed
}
