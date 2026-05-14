/**
 * Generate a short, readable, unique-ish code for assessment URLs.
 * Format: 6 chars [A-Z0-9] excluding confusing chars (0/O, 1/I, etc.)
 */
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateAssessmentCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length))
  }
  return code
}

/**
 * Convert grade (0-100) to a 0-20 vigesimal scale used in Peru.
 */
export function gradeTo20(grade: number): number {
  return Math.round((grade / 100) * 20 * 10) / 10 // 1 decimal
}

export function levelFromGrade20(grade20: number): { level: string; label: string; color: string } {
  // Peruvian system: 13/20 = 65/100 = passing
  if (grade20 >= 17) return { level: 'logrado_destacado', label: 'Logrado Destacado', color: 'emerald' }
  if (grade20 >= 13) return { level: 'logrado', label: 'Logrado', color: 'blue' }
  if (grade20 >= 11) return { level: 'en_proceso', label: 'En Proceso', color: 'amber' }
  return { level: 'en_inicio', label: 'En Inicio', color: 'red' }
}
