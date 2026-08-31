'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SophiaTalkingHead,
  type TalkingHeadHandle,
} from '@/components/learning/avatar-3d/sophia-talkinghead'
import { Button } from '@/components/ui/button'

type Lang = 'ES' | 'EN'
type Provider = 'openai' | 'webspeech'

const SAMPLE_TEXTS: Record<Lang, string> = {
  ES: 'Hola, soy Sophia, tu instructora virtual. Estamos por empezar la lección sobre tipos de reacciones químicas. ¿Listo para arrancar?',
  EN: 'Hi, I am Sophia, your virtual instructor. We are about to start the lesson on types of chemical reactions. Are you ready to begin?',
}

const LANG_TAG: Record<Lang, string> = { ES: 'es', EN: 'en' }

/**
 * 🎙️ Comparador de voces para Sophia 3D.
 *
 * Pone el mismo párrafo en boca de Brunette usando dos motores TTS distintos:
 *  - OpenAI gpt-4o-mini-tts (lo que usa Sophia hoy, ES + EN, pago)
 *  - Web Speech API nativa del browser (gratis, usa voces del SO, ES + EN)
 *
 * Trade-off importante: Web Speech NO expone el audio que reproduce, así que
 * NO podemos pasarlo al avatar 3D para lip-sync. Mientras Web Speech habla,
 * mostramos el avatar en pose "speaking" pero su boca no se mueve. Es un
 * comparador de VOZ, no de animación.
 *
 * Ruta: /dev/voice-compare (protegida).
 */
export default function VoiceComparePage() {
  const thRef = useRef<TalkingHeadHandle>(null)
  const [thReady, setThReady] = useState(false)
  const [thError, setThError] = useState<string | null>(null)

  const [lang, setLang] = useState<Lang>('ES')
  const [text, setText] = useState(SAMPLE_TEXTS.ES)
  const [busy, setBusy] = useState<Provider | null>(null)
  const [log, setLog] = useState<string[]>([])

  // Voces disponibles del SO (Web Speech API)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  // Selected voice por idioma — el usuario elige cuál usar
  const [selectedVoice, setSelectedVoice] = useState<Record<Lang, string>>({ ES: '', EN: '' })

  // Estabilizados: si se recrean en cada render, el useEffect del componente
  // SophiaTalkingHead remueve/reagrega su 'message' listener constantemente y
  // pierde el evento 'ready' del iframe en la ventana de carrera.
  const handleReady = useCallback(() => {
    setThReady(true)
    setThError(null)
  }, [])
  const handleError = useCallback((m: string) => setThError(m), [])

  function pushLog(line: string) {
    setLog((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()} · ${line}`])
  }

  function switchLang(next: Lang) {
    if (text === SAMPLE_TEXTS[lang]) setText(SAMPLE_TEXTS[next])
    setLang(next)
  }

  // ────────────────────────────────────────────────────────────
  // Web Speech API: cargar voces disponibles del SO
  // (en algunos browsers son async — escuchamos voiceschanged)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    function loadVoices() {
      const all = window.speechSynthesis.getVoices()
      setVoices(all)

      // Pre-seleccionar la mejor voz por idioma:
      // 1ª preferencia: voz neuronal/Microsoft (más natural)
      // 2ª: cualquier voz del idioma
      const pickBest = (langPrefix: string) => {
        const matches = all.filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
        if (matches.length === 0) return ''
        const neural = matches.find(
          (v) =>
            /microsoft|google|natural|neural|premium|enhanced/i.test(v.name)
        )
        return (neural ?? matches[0]).voiceURI
      }

      setSelectedVoice((prev) => ({
        ES: prev.ES || pickBest('es'),
        EN: prev.EN || pickBest('en'),
      }))
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // ────────────────────────────────────────────────────────────
  // OpenAI TTS (lo que ya usa Sophia hoy) — con lip-sync
  // ────────────────────────────────────────────────────────────
  async function speakWithOpenAI() {
    if (!thReady || busy) return
    setBusy('openai')
    setThError(null)
    pushLog(`OpenAI TTS · ${lang} · ${text.length} chars → solicitando…`)
    try {
      const t0 = performance.now()
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      const elapsed = Math.round(performance.now() - t0)
      pushLog(`OpenAI TTS · audio ${(buf.byteLength / 1024).toFixed(0)} KB en ${elapsed} ms`)
      thRef.current?.speakAudio(buf, text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setThError(`OpenAI TTS: ${msg}`)
      pushLog(`❌ OpenAI TTS: ${msg}`)
    } finally {
      setBusy(null)
    }
  }

  // ────────────────────────────────────────────────────────────
  // Web Speech API (nativa del SO) — sin lip-sync
  // ────────────────────────────────────────────────────────────
  function speakWithWebSpeech() {
    if (busy) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setThError('Web Speech: tu browser no soporta esta API')
      return
    }
    const voiceURI = selectedVoice[lang]
    if (!voiceURI) {
      pushLog(`❌ Web Speech: no hay voz ${LANG_TAG[lang]} instalada en tu SO`)
      return
    }

    setBusy('webspeech')
    setThError(null)

    // Cancelar cualquier utterance previa
    window.speechSynthesis.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    const voice = voices.find((v) => v.voiceURI === voiceURI)
    if (voice) utter.voice = voice
    utter.lang = voice?.lang ?? (lang === 'ES' ? 'es-PE' : 'en-US')
    utter.rate = 1.0
    utter.pitch = 1.0
    utter.volume = 1.0

    const t0 = performance.now()
    pushLog(`Web Speech · ${voice?.name ?? voiceURI} → reproduciendo…`)

    utter.onend = () => {
      pushLog(`Web Speech · terminó en ${Math.round(performance.now() - t0)} ms`)
      setBusy(null)
    }
    utter.onerror = (e) => {
      pushLog(`❌ Web Speech · error: ${e.error}`)
      setThError(`Web Speech: ${e.error}`)
      setBusy(null)
    }

    window.speechSynthesis.speak(utter)
  }

  function stopWebSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setBusy(null)
      pushLog('Web Speech · cancelado por el usuario')
    }
  }

  // Voces filtradas por idioma actual
  const voicesForLang = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(LANG_TAG[lang])
  )

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎙️ Comparador de voces — Sophia 3D</h1>
        <p className="text-sm text-muted-foreground">
          Mismo párrafo, mismo avatar (Brunette), distinta voz. Compará la voz
          comercial (OpenAI, pago, con lip-sync) contra las voces nativas de tu
          sistema operativo (Web Speech, gratis, sin lip-sync).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Avatar 3D */}
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Avatar (Brunette)
            </span>
            <span className="text-xs text-muted-foreground">
              {thError ? `❌ ${thError}` : thReady ? '✅ listo' : '⏳ cargando…'}
            </span>
          </div>
          <div className="overflow-hidden rounded-md bg-white">
            <SophiaTalkingHead
              ref={thRef}
              width={400}
              height={500}
              onReady={handleReady}
              onError={handleError}
            />
          </div>
        </div>

        {/* Controles */}
        <div className="space-y-4">
          {/* Idioma */}
          <div>
            <p className="mb-2 text-sm font-medium">Idioma del texto:</p>
            <div className="flex gap-2">
              {(['ES', 'EN'] as Lang[]).map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={lang === l ? 'default' : 'outline'}
                  onClick={() => switchLang(l)}
                >
                  {l === 'ES' ? '🇪🇸 Español' : '🇺🇸 English'}
                </Button>
              ))}
            </div>
          </div>

          {/* Texto */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Párrafo a leer:{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({text.length} chars)
              </span>
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={1000}
              className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={() => setText(SAMPLE_TEXTS[lang])}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              ↺ restaurar texto de muestra
            </button>
          </div>

          {/* OpenAI */}
          <div className="space-y-2 border-t pt-4">
            <Button
              className="w-full"
              disabled={!thReady || !!busy}
              onClick={speakWithOpenAI}
            >
              {busy === 'openai' ? '⏳ Generando audio…' : `▶ Hablar con OpenAI (${lang})`}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              gpt-4o-mini-tts · voz <code>shimmer</code> · ~$0.015 por 1000 chars
              · backend Vercel → OpenAI · <strong>con lip-sync</strong>
            </p>
          </div>

          {/* Web Speech API */}
          <div className="space-y-2 border-t pt-4">
            {/* Voice picker */}
            <div>
              <label className="mb-1 block text-xs font-medium">
                Voz del sistema ({voicesForLang.length} disponibles para {LANG_TAG[lang]}):
              </label>
              <select
                value={selectedVoice[lang]}
                onChange={(e) => setSelectedVoice((p) => ({ ...p, [lang]: e.target.value }))}
                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                disabled={voicesForLang.length === 0}
              >
                {voicesForLang.length === 0 ? (
                  <option value="">(no hay voces {LANG_TAG[lang]} instaladas en tu SO)</option>
                ) : (
                  voicesForLang.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang} {v.localService ? '(local)' : '(cloud)'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                disabled={!!busy || voicesForLang.length === 0}
                onClick={speakWithWebSpeech}
              >
                {busy === 'webspeech'
                  ? '🔊 Reproduciendo…'
                  : `▶ Hablar con Web Speech (${lang})`}
              </Button>
              {busy === 'webspeech' && (
                <Button variant="outline" onClick={stopWebSpeech}>
                  ⏹ Parar
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              API nativa del browser · usa las voces de tu Windows/macOS/iOS · gratis ·{' '}
              <strong>sin lip-sync</strong> (la boca del avatar queda quieta).
            </p>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Log de actividad
        </p>
        <div className="font-mono text-[11px] leading-relaxed text-slate-700 max-h-40 overflow-y-auto">
          {log.length === 0 ? (
            <span className="text-slate-400">Sin actividad todavía.</span>
          ) : (
            log.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <p className="mb-1 font-semibold">⚠️ Sobre Web Speech API:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            Usa las voces TTS de tu sistema operativo. En Windows 11 vienen{' '}
            <strong>Microsoft Pablo / Sabina / Helena (ES)</strong> y{' '}
            <strong>Aria / Guy (EN)</strong> — son neuronales y suenan muy bien.
          </li>
          <li>
            En Edge/Chrome aparecen también voces <code>Google Español</code> (cloud, gratis).
          </li>
          <li>
            <strong>Limitación clave:</strong> la API no expone el audio que reproduce,
            así que el avatar 3D <em>no puede animar la boca</em>. Si necesitás
            lip-sync, OpenAI es la única opción.
          </li>
          <li>
            La calidad depende del SO del alumno. Linux puede tener voces muy básicas.
          </li>
        </ul>
      </div>
    </div>
  )
}
