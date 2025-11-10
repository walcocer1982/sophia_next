/**
 * Configuración centralizada de feature flags y variables de entorno
 * Permite activar/desactivar funcionalidades según el ambiente
 */

/**
 * Feature flags para desarrollo
 * Solo se activan si NODE_ENV === 'development' Y la variable específica está en '1'
 */
export const devFeatures = {
  /**
   * Permite usar lecciones hardcodeadas desde archivos TypeScript
   * en lugar de cargarlas desde la base de datos.
   * Útil para desarrollo rápido y testing de contenido.
   */
  allowHardcodedLesson:
    process.env.ALLOW_HARDCODE_LESSON === '1' &&
    process.env.NODE_ENV === 'development',
}

/**
 * Feature flags para producción (futuro)
 * Estos pueden estar activos en cualquier ambiente
 */
export const features = {
  // enableStreaming: process.env.ENABLE_STREAMING !== 'false', // default true
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