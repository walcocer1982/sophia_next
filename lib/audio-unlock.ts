/**
 * Desbloqueo de audio para el kiosko.
 *
 * Los navegadores solo permiten `audio.play()` dentro de (o poco después de)
 * un gesto del usuario. El welcome del kiosko reproduce su TTS varios segundos
 * después del clic de "Comenzar" (fetch del welcome + fetch del TTS), así que
 * el autoplay llega bloqueado.
 *
 * Técnica estándar: dentro del clic se reproduce un WAV silencioso en un
 * elemento <audio> compartido. Un elemento que ya reprodujo algo durante un
 * gesto queda "consagrado" y acepta .play() sin gesto en reproducciones
 * futuras. Todo el audio posterior (welcome, respuestas TTS) debe reusar
 * ESTE MISMO elemento — crear `new Audio()` pierde el desbloqueo.
 */

// WAV PCM silencioso de ~1ms.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

let shared: HTMLAudioElement | null = null

/** Llamar SINCRÓNICAMENTE dentro de un click/submit handler. */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (!shared) shared = new Audio()
  try {
    shared.src = SILENT_WAV
    void shared.play().catch(() => {
      // Si igual lo bloquea (sin gesto real), no rompemos nada: los call
      // sites tienen su propio .catch() al reproducir.
    })
  } catch {
    // ignore — audio no disponible en este entorno
  }
}

/** Elemento desbloqueado para reusar en reproducciones posteriores (o null). */
export function getUnlockedAudio(): HTMLAudioElement | null {
  return shared
}
