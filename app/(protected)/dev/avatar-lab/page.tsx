'use client'

import { useRef, useState } from 'react'
import { SophiaAvatarSwitch } from '@/components/learning/avatar-3d/sophia-avatar-switch'
import { SophiaAvatar } from '@/components/learning/sophia-avatar'
import {
  SophiaTalkingHead,
  type TalkingHeadHandle,
  type TalkingHeadGesture,
  type TalkingHeadMood,
} from '@/components/learning/avatar-3d/sophia-talkinghead'
import { Button } from '@/components/ui/button'

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

const STATES: AvatarState[] = ['idle', 'listening', 'speaking', 'processing']
const GESTURES: TalkingHeadGesture[] = [
  'handup',
  'index',
  'ok',
  'thumbup',
  'thumbdown',
  'side',
  'shrug',
  'namaste',
]
const MOODS: TalkingHeadMood[] = ['neutral', 'happy', 'sad', 'angry', 'love', 'fear']

/**
 * 🧪 Sandbox aislado para el experimento avatar-3d.
 * Ruta: /dev/avatar-lab  (protegida por auth)
 */
export default function AvatarLabPage() {
  const [state, setState] = useState<AvatarState>('idle')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [activeUrl, setActiveUrl] = useState<string | undefined>(undefined)

  // --- TalkingHead (motor real) ---
  const thRef = useRef<TalkingHeadHandle>(null)
  const [thReady, setThReady] = useState(false)
  const [thError, setThError] = useState<string | null>(null)
  const [thAvatarUrl, setThAvatarUrl] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [speakText, setSpeakText] = useState('Hola, soy Sophia, tu instructora virtual.')

  async function handleSpeak() {
    const text = speakText.trim()
    if (!text) return
    setSpeaking(true)
    setThError(null)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'ES' }),
      })
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      thRef.current?.speakAudio(buf, text)
    } catch (e) {
      setThError(e instanceof Error ? e.message : String(e))
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-2xl font-bold">🧪 Avatar Lab</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Sandbox del experimento avatar-3d. Comparación entre el avatar 2D actual, el
        visor 3D básico y el motor TalkingHead (manos + boca).
      </p>

      {/* Fila 1: 2D actual vs visor 3D básico */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Actual (2D)
          </span>
          <SophiaAvatar state={state} size={240} />
        </div>

        <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Visor 3D básico (placeholder/GLB)
          </span>
          <SophiaAvatarSwitch state={state} size={240} avatarUrl={activeUrl} force3D />
        </div>
      </div>

      {/* Controles del visor básico */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">Estado (2D + visor básico):</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={state === s ? 'default' : 'outline'}
              onClick={() => setState(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="URL .glb para el visor básico (opcional)"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={() => setActiveUrl(avatarUrl || undefined)}>
            Cargar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAvatarUrl('')
              setActiveUrl(undefined)
            }}
          >
            Placeholder
          </Button>
        </div>
      </div>

      {/* Fila 2: Motor TalkingHead */}
      <div className="mt-10 rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Motor TalkingHead (manos + boca)
          </span>
          <span className="text-xs text-muted-foreground">
            {thError ? `❌ ${thError}` : thReady ? '✅ listo' : '⏳ cargando…'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="shrink-0 overflow-hidden rounded-lg border bg-slate-50">
            <SophiaTalkingHead
              ref={thRef}
              width={360}
              height={460}
              onReady={() => {
                setThReady(true)
                setThError(null)
              }}
              onError={(m) => setThError(m)}
            />
          </div>

          <div className="flex-1 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">👋 Gestos de manos:</p>
              <div className="flex flex-wrap gap-2">
                {GESTURES.map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant="outline"
                    disabled={!thReady}
                    onClick={() => thRef.current?.gesture(g)}
                  >
                    {g}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!thReady}
                  onClick={() => thRef.current?.stopGesture()}
                >
                  stop
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">😊 Estado de ánimo:</p>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant="outline"
                    disabled={!thReady}
                    onClick={() => thRef.current?.setMood(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                🗣️ Hablar (boca) —{' '}
                <span className="text-muted-foreground">
                  TTS español (OpenAI) + lip-sync por palabras
                </span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={speakText}
                  onChange={(e) => setSpeakText(e.target.value)}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="Escribe algo en español…"
                />
                <Button size="sm" disabled={!thReady || speaking} onClick={handleSpeak}>
                  {speaking ? 'Generando…' : 'Speak'}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">🧍 Cambiar avatar (.glb):</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={thAvatarUrl}
                  onChange={(e) => setThAvatarUrl(e.target.value)}
                  placeholder="https://models.readyplayer.me/....glb"
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                />
                <Button
                  size="sm"
                  disabled={!thReady || !thAvatarUrl}
                  onClick={() => thRef.current?.loadAvatar(thAvatarUrl)}
                >
                  Cargar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
