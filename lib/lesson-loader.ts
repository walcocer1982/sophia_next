/**
 * Sistema para cargar lecciones desde la base de datos
 */

import { prisma } from '@/lib/prisma'
import { parseContentJson } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

/**
 * Carga el contenido de una lección desde DB
 *
 * @param lessonId - ID de la lección
 * @returns LessonContent parseado o null si no existe
 */
export async function getLessonContent(
  lessonId: string
): Promise<LessonContent | null> {
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

    logger.info('lesson.loader.database', {
      lessonId,
      title: lesson.title,
      source: 'database',
    })

    return parseContentJson(lesson.contentJson) as LessonContent
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
