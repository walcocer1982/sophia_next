/**
 * Simple in-memory rate limiter
 * TODO: Usar Redis (Upstash) en producción para rate limiting distribuido
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limiter = new Map<string, RateLimitEntry>()

/**
 * Check rate limit for a user
 * @param userId - User ID to check
 * @param limit - Maximum requests allowed (default: 10)
 * @param windowSeconds - Time window in seconds (default: 60)
 * @returns {allowed: boolean, remaining: number, resetAt: number}
 */
export function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowSeconds: number = 60
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = limiter.get(userId)

  // Si no existe entry o expiró, crear nueva
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000
    limiter.set(userId, { count: 1, resetAt })

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    }
  }

  // Si alcanzó el límite
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Incrementar contador
  entry.count++
  limiter.set(userId, entry)

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Reset rate limit for a user (útil para testing)
 */
export function resetRateLimit(userId: string): void {
  limiter.delete(userId)
}

/**
 * Limpiar entries expiradas (ejecutar periódicamente)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [userId, entry] of limiter.entries()) {
    if (now > entry.resetAt) {
      limiter.delete(userId)
    }
  }
}

// Limpiar entries cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}
