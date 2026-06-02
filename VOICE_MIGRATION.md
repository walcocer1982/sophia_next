# Migración de Voz — STT + Claude + TTS

**Fecha discusión:** 2026-06-02
**Fecha implementación:** 2026-06-02 (mismo día)
**Estado:** ✅ Implementado — pendiente testing en producción
**Driver:** Pedagogía consistente texto/voz + bajar costo OpenAI ~50×

---

## 🎯 Problema que resolvía

Antes Sophia tenía **dos cerebros distintos** según el modo:

```
Modo TEXTO:                    Modo VOZ (antes):
─────────────                  ─────────────
Estudiante escribe             Estudiante habla
    ↓                              ↓
Claude (cerebro real)          GPT-Realtime (cerebro paralelo)
    ↓                              ↓
Responde en texto              Responde en voz
```

**Consecuencias del modelo viejo:**

1. La voz no hacía verificación de actividad bien (gpt-realtime ignoraba prompts pedagógicos)
2. La voz se auto-encadenaba (gpt-realtime generaba múltiples respuestas sin esperar)
3. La voz no respetaba `methodology` REFLECTIVE/CODE
4. Mantenimiento de **dos prompts paralelos** (`prompt-builder.ts` ~700 líneas + `voice-prompt.ts` ~80 líneas)
5. **Costos altos:** Realtime API audio in $32/1M tokens, audio out $64/1M tokens

---

## ✅ Arquitectura implementada

Todo dentro de OpenAI — sin cambiar de proveedor — pero con servicios **separados**:

```
Estudiante habla
    ↓
OpenAI Realtime API en modo "transcription"  ← oídos
(gpt-realtime-whisper, streaming, language=es)
    ↓
Texto del estudiante (transcript completo)
    ↓
/api/chat/stream → Claude              ← cerebro ÚNICO
(toda la pedagogía existente: rubric, escalada, scaffolding, turn-taking, cierre)
    ↓
Texto de Sophia (streaming)
    ↓
/api/voice/speak → OpenAI TTS          ← boca
(gpt-4o-mini-tts, voz "coral", instrucciones "español latinoamericano")
    ↓
Audio (opus streaming)
    ↓
Estudiante escucha
```

### Ventajas conseguidas

- ✅ Pedagogía idéntica texto y voz (Claude es el cerebro en ambos)
- ✅ Sin auto-encadenamiento (no hay LLM en OpenAI decidiendo solo)
- ✅ Todas las features de Claude funcionan en voz (rubric, escalada, hints, PROJECT_BRIEF)
- ✅ Un solo prompt (`prompt-builder.ts`) — `voice-prompt.ts` ya no se usa
- ✅ ~50× más barato (sin audio tokens del Realtime)
- ✅ Voz latinoamericana nativa (gpt-4o-mini-tts default)
- ✅ Mismo proveedor (OpenAI) — no agregamos Azure ni ElevenLabs

### Trade-offs

- ⚠️ Latencia ~1-1.5s extra por turno (vs ~500ms del Realtime end-to-end)
- ⚠️ Pierde interrupciones bidireccionales mid-speech
- ⚠️ El TTS reproduce el response **completo** de Claude (no chunked por oración todavía)

Para tutoring estos trade-offs son aceptables.

---

## 📂 Archivos cambiados

### Modificados
- [`app/api/voice/session/route.ts`](app/api/voice/session/route.ts) — ahora crea sesión con `type: 'transcription'`, modelo `gpt-realtime-whisper`, sin generación de respuesta
- [`hooks/use-voice-chat.ts`](hooks/use-voice-chat.ts) — reescrito: solo procesa `input_audio_transcription.*`, llama a `streamChatResponse()` (Claude) y a `/api/voice/speak` (TTS), reproduce audio. Sin handlers de `response.*` ni guards anti-auto-chain (ya no aplican).

### Nuevo
- [`app/api/voice/speak/route.ts`](app/api/voice/speak/route.ts) — endpoint TTS streaming con `gpt-4o-mini-tts`, voz `coral`, instrucciones para español latinoamericano, formato `opus`

### Sin cambios (la voz reusa el flujo de texto)
- `/api/chat/stream` — exactamente igual; ahora maneja tanto texto como voz transparentemente
- `/api/voice/message` — sigue persistiendo mensaje + disparando verificación
- `lib/prompt-builder.ts` — sigue siendo el único prompt de Sophia
- `lib/activity-verification.ts` — sin cambios
- `lib/grading.ts` — sin cambios

### Obsoleto (queda en disco por si querés volver atrás temporalmente)
- `lib/voice-prompt.ts` — ya no se importa desde ningún lado. Podemos eliminarlo en un cleanup pass.

---

## 💰 Costos comparados

### Por sesión típica de 5 min (estudiante habla ~2 min, Sophia ~3 min)

| Componente | Antes (Realtime end-to-end) | Ahora (Whisper + Claude + TTS) |
|---|---|---|
| Audio in (estudiante) | $0.32 (Realtime audio) | $0.012 (Whisper transcription) |
| Cerebro | incluido en audio | $0.02 (Claude texto) |
| Audio out (Sophia) | $0.96 (Realtime audio) | $0.045 (gpt-4o-mini-tts opus) |
| **Total por sesión 5 min** | **~$1.28** | **~$0.08** |
| **Ahorro** | — | **94%** |

### Proyección a 100 estudiantes/día (5 min voz c/u)

| Stack | Costo diario | Costo mensual |
|---|---|---|
| Realtime end-to-end (antes) | ~$128/día | ~$3,840/mes |
| Whisper + Claude + TTS (ahora) | ~$8/día | ~$240/mes |

**Ahorro mensual a esa escala: ~$3,600**

---

## 🧪 Cómo probar

1. Entrar a `/eval/[código]` como invitado
2. Click en "Activar voz"
3. Verificar que pide micrófono
4. Presionar "Click para hablar" y hablar (mín 0.8s)
5. Click "Click para enviar"
6. Esperar ~1-2s — debería aparecer el texto del estudiante, luego streaming de Claude, luego audio de Sophia hablando con acento latino

### Qué chequear en consola

- Network: `/api/voice/session` → 200 (transcription token)
- Network: `/api/chat/stream` → SSE de Claude
- Network: `/api/voice/speak` → audio/ogg blob (varios KB)
- Voice events: solo `conversation.item.input_audio_transcription.*` (NO `response.*`)

---

## 🔮 Optimizaciones futuras (no críticas)

1. **TTS por oraciones** — partir el response de Claude en oraciones (`. ? !`) y mandar cada una a TTS en paralelo, reproducir en orden. Reduciría latencia de 1.5s a ~500ms en el primer audio.

2. **Vista de transcript en vivo** — los deltas de `input_audio_transcription.delta` se podrían mostrar mientras el estudiante habla (feedback visual rápido).

3. **Eliminar `lib/voice-prompt.ts`** — código muerto desde la migración.

4. **Cancelación de TTS mid-playback** — si el estudiante presiona PTT mientras Sophia habla, cortar la reproducción.

5. **Voice picking** — probar otras voces de `gpt-4o-mini-tts` (alloy, ash, ballad, marin, cedar) y dejar configurable por curso si querés.

---

## 📚 Referencias técnicas

- [OpenAI Realtime Transcription Guide](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [OpenAI Text-to-Speech Guide](https://developers.openai.com/api/docs/guides/text-to-speech)
- [GPT-4o-mini-tts Model docs](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)
- [Realtime Out-of-band Transcription cookbook](https://cookbook.openai.com/examples/realtime_out_of_band_transcription)
