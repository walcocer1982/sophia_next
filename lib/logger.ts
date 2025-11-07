/**
 * Simple structured logger for development
 * TODO: Integrar con servicio de logging (DataDog, LogRocket, etc.) en producción
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMetadata {
  [key: string]: any
}

/**
 * Log structured message
 */
export function log(
  level: LogLevel,
  event: string,
  metadata?: LogMetadata
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    event,
    ...metadata,
  }

  // En desarrollo: console log colorizado
  if (process.env.NODE_ENV === 'development') {
    const emoji = getEmoji(level)
    console.log(`${emoji} [${level.toUpperCase()}] ${event}`, metadata || '')
  } else {
    // En producción: JSON estructurado
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Convenience functions
 */
export const logger = {
  info: (event: string, metadata?: LogMetadata) => log('info', event, metadata),
  warn: (event: string, metadata?: LogMetadata) => log('warn', event, metadata),
  error: (event: string, metadata?: LogMetadata) =>
    log('error', event, metadata),
  debug: (event: string, metadata?: LogMetadata) =>
    log('debug', event, metadata),
}

/**
 * Get emoji for log level
 */
function getEmoji(level: LogLevel): string {
  switch (level) {
    case 'info':
      return 'ℹ️'
    case 'warn':
      return '⚠️'
    case 'error':
      return '❌'
    case 'debug':
      return '🔍'
  }
}

/**
 * Log chat message
 */
export function logChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  contentLength: number,
  tokens?: { input: number; output: number }
): void {
  logger.info('chat.message', {
    sessionId,
    role,
    contentLength,
    tokens,
  })
}

/**
 * Log activity completion
 */
export function logActivityCompletion(
  sessionId: string,
  activityId: string,
  attempts: number
): void {
  logger.info('activity.completed', {
    sessionId,
    activityId,
    attempts,
  })
}

/**
 * Log error with stack trace
 */
export function logError(
  error: Error,
  context: string,
  metadata?: LogMetadata
): void {
  logger.error(context, {
    message: error.message,
    stack: error.stack,
    ...metadata,
  })
}
