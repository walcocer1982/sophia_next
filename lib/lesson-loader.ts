/**
 * Sistema para cargar lecciones desde la base de datos
 */

import { prisma } from '@/lib/prisma'
import { parseContentJson } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

// Cache en proceso del contenido YA PARSEADO. El contentJson no cambia durante
// una sesión/evento, así que re-consultar Neon + re-parsear el JSON en cada
// mensaje era latencia pura. TTL corto (60s) para reflejar ediciones del
// instructor sin reiniciar el server.
const LESSON_CONTENT_TTL_MS = 60_000
const lessonContentCache = new Map<string, { value: LessonContent; expiresAt: number }>()

/**
 * Carga el contenido de una lección desde DB (con cache de 60s).
 *
 * @param lessonId - ID de la lección
 * @returns LessonContent parseado o null si no existe
 */
export async function getLessonContent(
  lessonId: string
): Promise<LessonContent | null> {
  const cached = lessonContentCache.get(lessonId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        contentJson: true,
        title: true,
      }
    })

    if (!lesson?.contentJson) {
      logger.warn('lesson.loader.notfound', {
        lessonId,
        message: 'Lesson not found in database'
      })
      return null
    }

    const parsed = parseContentJson(lesson.contentJson) as LessonContent
    lessonContentCache.set(lessonId, {
      value: parsed,
      expiresAt: Date.now() + LESSON_CONTENT_TTL_MS,
    })
    return parsed
  } catch (error) {
    logger.error('lesson.loader.database.error', {
      lessonId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * Obtiene metadata básica de la lección con datos del curso
 */
export async function getLessonMetadata(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      keyPoints: true,
      isPublished: true,
      course: {
        select: {
          id: true,
          title: true,
          instructor: true,
        }
      }
    }
  })
}

/**
 * Obtiene todas las lecciones de un curso
 */
export async function getCourseLessons(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      keyPoints: true,
      order: true,
      isPublished: true,
    }
  })
}
