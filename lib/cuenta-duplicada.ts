/**
 * ¿La cuenta de Google y la del padrón son de la misma persona? (26 oct 2026)
 *
 * Un alumno que entra con un correo distinto al del padrón recibe una cuenta
 * nueva, sin DNI: su trabajo no se ve en el Monitor, la matriz ni el reporte
 * (Cuellar, Sostenimiento EOM A: «Aún no entran» mientras trabajaba). Había 27
 * cuentas así. Para unirlas, el DNI dice cuál es la cuenta del padrón y el nombre
 * confirma que es la misma persona: Google lo da como «Zayda Cuellar Flores» y
 * el padrón como «Cuellar Flores Zayda Sarita», así que se comparan palabras,
 * no el orden.
 */

const VACIAS = new Set(['del', 'los', 'las', 'de', 'la', 'y'])

/** Las palabras del nombre, sin tildes ni mayúsculas, de 3 letras o más. */
export function palabrasDelNombre(nombre: string | null | undefined): Set<string> {
  return new Set(
    (nombre ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-zñ]+/)
      .filter((w) => w.length > 2 && !VACIAS.has(w))
  )
}

/**
 * Al menos dos palabras en común: nombre y apellido, o los dos apellidos. Con
 * una sola («Mili Monroy» y «Monroy Huamaní Milagros Lizeth») no alcanza: lo une
 * el tutor a mano.
 */
export function nombresCoinciden(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = palabrasDelNombre(a)
  const pb = palabrasDelNombre(b)
  let comunes = 0
  for (const w of pa) if (pb.has(w)) comunes++
  return comunes >= 2
}

/** DNI peruano: 8 dígitos. */
export const esDni = (texto: string): boolean => /^\d{8}$/.test(texto.trim())
