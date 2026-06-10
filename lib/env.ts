/**
 * Feature flags del proyecto.
 *
 * Se leen de variables de entorno para poder encender/apagar features
 * sin redeploy de código. Por defecto TODO está OFF.
 *
 * Para activar el avatar 3D experimental en local, agrega a tu `.env`:
 *   NEXT_PUBLIC_ENABLE_3D_AVATAR=true
 *
 * Nota: el prefijo NEXT_PUBLIC_ es obligatorio porque el flag se evalúa
 * en el cliente (el avatar 3D es un Client Component).
 */
export const featureFlags = {
  /** Avatar 3D (TalkingHead/Three.js) — experimento aislado. */
  enable3DAvatar: process.env.NEXT_PUBLIC_ENABLE_3D_AVATAR === 'true',
}
