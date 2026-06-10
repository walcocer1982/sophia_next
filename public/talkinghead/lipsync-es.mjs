/**
 * @class Procesador de lip-sync para Español (latinoamericano / seseo)
 *
 * Sigue la interfaz que TalkingHead espera (preProcessText + wordsToVisemes),
 * inspirado en el módulo finés oficial (lipsync-fi.mjs). El español, como el
 * finés, es muy fonético: cada letra mapea de forma regular a un visema.
 *
 * Visemas Oculus usadas (todas presentes en avatares RPM/TalkingHead):
 *   aa E I O U  PP SS DD FF kk nn RR
 * Se evitan CH y TH: con seseo latino (Perú) la "z" y "ce/ci" suenan como "s".
 */
class LipsyncEs {
  constructor() {
    // Letras del español → visemas Oculus.
    // Las consonantes con contexto (c, g, q) y los dígrafos (ch, ll, rr, qu)
    // se resuelven en wordsToVisemes(), no aquí.
    this.visemes = {
      a: 'aa', á: 'aa',
      e: 'E', é: 'E',
      i: 'I', í: 'I', y: 'I',
      o: 'O', ó: 'O',
      u: 'U', ú: 'U', ü: 'U',
      b: 'PP', v: 'PP', m: 'PP', p: 'PP',
      f: 'FF', w: 'FF',
      d: 'DD', t: 'DD',
      s: 'SS', z: 'SS', x: 'SS',
      k: 'kk', j: 'kk',
      l: 'nn', n: 'nn', ñ: 'nn',
      r: 'RR',
    }

    // Duraciones relativas por visema (1 = promedio). Calibradas con el finés.
    this.visemeDurations = {
      aa: 0.95, E: 0.9, I: 0.92, O: 0.96, U: 0.95,
      PP: 1.08, SS: 1.23, DD: 1.05, FF: 1.0, kk: 1.21,
      nn: 0.88, RR: 0.88, sil: 1,
    }

    // Pausas relativas (1 = promedio).
    this.specialDurations = { ' ': 1, ',': 3, '.': 4, '-': 0.5, ';': 3, ':': 3 }

    // Símbolos → palabras en español.
    this.symbols = {
      '%': 'por ciento', '€': 'euros', $: 'dólares', '&': 'y', '+': 'más', '=': 'igual',
    }
    this.symbolsReg = /[%€$&+=]/g

    // Números base (0–29: el español usa formas únicas hasta el 29).
    this.units = [
      'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
      'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
      'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós',
      'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
      'veintiocho', 'veintinueve',
    ]
    this.tens = {
      3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta',
      7: 'setenta', 8: 'ochenta', 9: 'noventa',
    }
    this.hundreds = {
      1: 'ciento', 2: 'doscientos', 3: 'trescientos', 4: 'cuatrocientos',
      5: 'quinientos', 6: 'seiscientos', 7: 'setecientos', 8: 'ochocientos',
      9: 'novecientos',
    }
  }

  /** Número < 100 a palabras. */
  below100(n) {
    if (n < 30) return this.units[n]
    const t = Math.floor(n / 10)
    const u = n % 10
    return this.tens[t] + (u > 0 ? ' y ' + this.units[u] : '')
  }

  /** Número < 1000 a palabras. */
  below1000(n) {
    if (n === 0) return ''
    if (n === 100) return 'cien'
    const h = Math.floor(n / 100)
    const r = n % 100
    let w = h > 0 ? this.hundreds[h] : ''
    if (r > 0) w += (h > 0 ? ' ' : '') + this.below100(r)
    return w
  }

  /** Entero a palabras en español (hasta miles de millones). */
  numberToSpanishWords(x) {
    let n = parseInt(x, 10)
    if (isNaN(n)) return x
    if (n < 0) return 'menos ' + this.numberToSpanishWords(String(-n))
    if (n < 1000) return this.below1000(n) || 'cero'
    if (n < 1000000) {
      const th = Math.floor(n / 1000)
      const r = n % 1000
      let w = th === 1 ? 'mil' : this.below1000(th) + ' mil'
      if (r > 0) w += ' ' + this.below1000(r)
      return w
    }
    if (n < 1000000000) {
      const mill = Math.floor(n / 1000000)
      const r = n % 1000000
      let w = mill === 1 ? 'un millón' : this.numberToSpanishWords(String(mill)) + ' millones'
      if (r > 0) w += ' ' + this.numberToSpanishWords(String(r))
      return w
    }
    return String(n)
  }

  /**
   * Preprocesa el texto: símbolos→palabras, números→palabras, limpia ruido.
   * Conserva los acentos (las vocales acentuadas son necesarias).
   */
  preProcessText(s) {
    return s
      .replace(/[#_*'"():;]/g, '')
      .replace(this.symbolsReg, (sym) => ' ' + this.symbols[sym] + ' ')
      .replace(/(\d),(\d)/g, '$1 punto $2') // decimal en español
      .replace(/\d+/g, (m) => this.numberToSpanishWords(m))
      .replaceAll('  ', ' ')
      .trim()
  }

  /**
   * Convierte palabras a visemas Oculus + tiempos/duraciones relativos.
   * Maneja dígrafos (ch, ll, rr, qu, gu) y consonantes con contexto (c, g).
   */
  wordsToVisemes(w) {
    const o = { words: w, visemes: [], times: [], durations: [] }
    let t = 0
    const chars = [...w.toLowerCase()]

    const push = (viseme) => {
      const last = o.visemes[o.visemes.length - 1]
      if (last === viseme) {
        // Misma visema seguida → alarga la anterior (no la repite).
        const d = 0.7 * (this.visemeDurations[viseme] || 1)
        o.durations[o.durations.length - 1] += d
        t += d
      } else {
        const d = this.visemeDurations[viseme] || 1
        o.visemes.push(viseme)
        o.times.push(t)
        o.durations.push(d)
        t += d
      }
    }

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]
      const n = chars[i + 1]

      // --- Dígrafos ---
      if (c === 'c' && n === 'h') { push('SS'); i++; continue } // "ch" → fricativa
      if (c === 'l' && n === 'l') { push('I'); i++; continue } // "ll" ≈ "y"
      if (c === 'r' && n === 'r') { push('RR'); i++; continue } // "rr"
      if (c === 'q' && n === 'u') { push('kk'); i++; continue } // "qu" → k (u muda)

      // --- Consonantes con contexto ---
      if (c === 'c') { push(n === 'e' || n === 'i' || n === 'é' || n === 'í' ? 'SS' : 'kk'); continue }
      if (c === 'g') {
        push('kk') // velar en ambos casos (ga/go/gu y ge/gi=jota)
        // "gue"/"gui": la u es muda → la saltamos
        if (n === 'u' && (chars[i + 2] === 'e' || chars[i + 2] === 'i')) i++
        continue
      }
      if (c === 'h') { t += 0.2; continue } // "h" muda

      // --- Mapeo directo ---
      const viseme = this.visemes[c]
      if (viseme) {
        push(viseme)
      } else {
        t += this.specialDurations[c] || 0
      }
    }

    return o
  }
}

export { LipsyncEs }
