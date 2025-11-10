/**
 * Sistema para cargar lecciones desde diferentes fuentes
 * Permite usar archivos hardcodeados en desarrollo o DB en producción
 */

import { devFeatures } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { parseContentJson } from '@/lib/lesson-parser'
import { logger } from '@/lib/logger'
import type { LessonContent } from '@/types/lesson'

/**
 * Carga el contenido de una lección desde archivo hardcodeado o DB
 *
 * En desarrollo con ALLOW_HARDCODE_LESSON=1:
 * - Intenta cargar desde @/data/lesson01.ts
 * - Si falla, cae a DB como fallback
 *
 * En producción o sin el flag:
 * - Siempre carga desde DB
 *
 * @param lessonId - ID de la lección (usado para DB, ignorado en hardcoded)
 * @returns LessonContent parseado o null si no existe
 */
export async function getLessonContent(
  lessonId: string
): Promise<LessonContent | null> {
  // Si está activado el hardcoding, intentar cargar desde archivo
  if (devFeatures.allowHardcodedLesson) {
    try {
      // Importación dinámica del archivo de lección hardcodeada
      const lessonModule = await import('@/data/lesson01')
      const hardcodedLesson = lessonModule.hardcodedLesson || lessonModule.default

      logger.info('lesson.loader.hardcoded', {
        source: 'data/lesson01.ts',
        lessonId, // Log el ID solicitado para debugging
        message: '📚 Using hardcoded lesson from data/lesson01.ts'
      })

      return hardcodedLesson as LessonContent
    } catch (error) {
      logger.warn('lesson.loader.hardcoded.error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '⚠️ Failed to load hardcoded lesson, falling back to DB'
      })
      // Continuar con carga desde DB
    }
  }

  // Cargar desde DB normalmente
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        contentJson: true,
        title: true,
        description: true
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
      message: '💾 Using lesson from database'
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
 * Helper para verificar si una lección está usando contenido hardcodeado
 * Útil para mostrar indicadores en UI durante desarrollo
 */
export function isUsingHardcodedLesson(): boolean {
  return devFeatures.allowHardcodedLesson
}

/**
 * Obtiene metadata básica de la lección (para cuando no necesitas el contentJson completo)
 * Siempre usa DB ya que el hardcoded es solo para contentJson
 */
export async function getLessonMetadata(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      description: true,
      estimatedMinutes: true,
      isPublished: true,
    }
  })
}