/**
 * Configuración centralizada de feature flags y variables de entorno
 */

/**
 * Feature flags para desarrollo
 */
export const devFeatures = {
  // Removed: allowHardcodedLesson - now always load from database
}

/**
 * Feature flags para producción (futuro)
 */
export const features = {
  // enableStreaming: process.env.ENABLE_STREAMING !== 'false',
  // enableActivityProgression: process.env.ENABLE_ACTIVITY_PROGRESSION !== 'false',
  // enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
}

/**
 * Variables de configuración general
 */
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}
