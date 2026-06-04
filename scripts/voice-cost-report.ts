/**
 * Reporte de uso/costo de sesiones de voz.
 *
 * Lo que SÍ puede extraer del DB:
 *  - Duración de sesión (proxy de minutos hablados en modo voz)
 *  - Tokens Claude por mensaje → costo Claude exacto
 *  - Conteo de mensajes user/assistant
 *  - Caracteres totales del assistant (proxy para TTS chars → costo OpenAI TTS)
 *
 * Lo que NO puede:
 *  - Segundos exactos de Whisper (no se loguea — viene del dashboard OpenAI)
 *  - Distinguir mensajes enviados por voz vs texto
 *
 * Uso:
 *   npx tsx scripts/voice-cost-report.ts            # hoy
 *   npx tsx scripts/voice-cost-report.ts 2026-06-03 # un día
 *   npx tsx scripts/voice-cost-report.ts 2026-06-02 2026-06-03  # rango
 */

import { prisma } from '../lib/prisma'

// Pricing (USD por 1M tokens / 1K chars / minuto)
const CLAUDE_SONNET_4_5_INPUT_PER_M = 3.0    // $3 / 1M input tokens
const CLAUDE_SONNET_4_5_OUTPUT_PER_M = 15.0  // $15 / 1M output tokens
const OPENAI_TTS_PER_1K_CHARS = 0.015        // gpt-4o-mini-tts: ~$0.015 / 1K chars
const OPENAI_WHISPER_PER_MIN = 0.006         // Whisper estándar (realtime cuesta más)

function parseDate(s: string): Date {
  // YYYY-MM-DD → UTC 00:00:00
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fmt(n: number, dec = 4): string {
  return n.toFixed(dec)
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`
}

function fmtMin(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

async function main() {
  const args = process.argv.slice(2)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let from: Date
  let to: Date

  if (args.length === 0) {
    from = today
    to = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  } else if (args.length === 1) {
    from = parseDate(args[0])
    to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  } else {
    from = parseDate(args[0])
    to = new Date(parseDate(args[1]).getTime() + 24 * 60 * 60 * 1000)
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 REPORTE DE USO — ${from.toISOString().slice(0, 10)} → ${new Date(to.getTime() - 1).toISOString().slice(0, 10)}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  const sessions = await prisma.lessonSession.findMany({
    where: {
      startedAt: { gte: from, lt: to },
    },
    include: {
      user: { select: { name: true, email: true } },
      lesson: {
        select: {
          title: true,
          course: { select: { voiceEnabled: true, title: true } },
        },
      },
      messages: {
        select: {
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
          timestamp: true,
        },
      },
      assessmentParticipant: {
        select: { firstName: true, lastName: true, dni: true },
      },
    },
    orderBy: { startedAt: 'asc' },
  })

  if (sessions.length === 0) {
    console.log('Sin sesiones en este rango.\n')
    await prisma.$disconnect()
    return
  }

  let totalDurationSec = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalAssistantChars = 0
  let voiceSessionCount = 0

  for (const s of sessions) {
    const endTime = s.endedAt ?? s.lastActivityAt
    const durationSec = Math.max(0, (endTime.getTime() - s.startedAt.getTime()) / 1000)
    const voiceEnabled = s.lesson.course.voiceEnabled

    const inputTokens = s.messages.reduce((a, m) => a + (m.inputTokens ?? 0), 0)
    const outputTokens = s.messages.reduce((a, m) => a + (m.outputTokens ?? 0), 0)
    const assistantChars = s.messages
      .filter((m) => m.role === 'assistant')
      .reduce((a, m) => a + m.content.length, 0)

    const userMsgs = s.messages.filter((m) => m.role === 'user').length
    const asstMsgs = s.messages.filter((m) => m.role === 'assistant').length

    const claudeCost =
      (inputTokens / 1_000_000) * CLAUDE_SONNET_4_5_INPUT_PER_M +
      (outputTokens / 1_000_000) * CLAUDE_SONNET_4_5_OUTPUT_PER_M

    const ttsCostEst = voiceEnabled
      ? (assistantChars / 1000) * OPENAI_TTS_PER_1K_CHARS
      : 0

    // Estimado pesimista: asumimos que ~50% de la duración fue audio entrando (user hablando)
    // Esto es MUY rough. El número real está en OpenAI dashboard.
    const whisperMinEst = voiceEnabled ? (durationSec * 0.5) / 60 : 0
    const whisperCostEst = whisperMinEst * OPENAI_WHISPER_PER_MIN

    const totalSessionCost = claudeCost + ttsCostEst + whisperCostEst

    totalDurationSec += durationSec
    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens
    totalAssistantChars += assistantChars
    if (voiceEnabled) voiceSessionCount++

    const who = s.assessmentParticipant
      ? `${s.assessmentParticipant.firstName} ${s.assessmentParticipant.lastName ?? ''} [demo]`
      : s.user.name ?? s.user.email

    console.log(`📝 ${s.startedAt.toISOString().slice(11, 16)} UTC — ${who}`)
    console.log(`   Curso: ${s.lesson.course.title} | Lección: ${s.lesson.title}`)
    console.log(`   Voz: ${voiceEnabled ? '✅' : '❌'} | Duración: ${fmtMin(durationSec)} | Mensajes: ${userMsgs}u / ${asstMsgs}a`)
    console.log(`   Claude: ${inputTokens.toLocaleString()} in + ${outputTokens.toLocaleString()} out = ${fmtUsd(claudeCost)}`)
    if (voiceEnabled) {
      console.log(`   TTS:   ${assistantChars.toLocaleString()} chars ≈ ${fmtUsd(ttsCostEst)} (est)`)
      console.log(`   Whisper: ~${fmt(whisperMinEst, 1)}min ≈ ${fmtUsd(whisperCostEst)} (rough est, ver dashboard)`)
    }
    console.log(`   💰 Total sesión: ${fmtUsd(totalSessionCost)}`)
    console.log()
  }

  const totalClaude =
    (totalInputTokens / 1_000_000) * CLAUDE_SONNET_4_5_INPUT_PER_M +
    (totalOutputTokens / 1_000_000) * CLAUDE_SONNET_4_5_OUTPUT_PER_M
  const totalTtsEst = (totalAssistantChars / 1000) * OPENAI_TTS_PER_1K_CHARS
  const totalWhisperMinEst = (totalDurationSec * 0.5) / 60
  const totalWhisperEst = totalWhisperMinEst * OPENAI_WHISPER_PER_MIN

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 TOTALES DEL PERIODO`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Sesiones totales:        ${sessions.length}`)
  console.log(`  Con voz habilitada:    ${voiceSessionCount}`)
  console.log(`Duración total:          ${fmtMin(totalDurationSec)} (${fmt(totalDurationSec / 60, 1)} min)`)
  console.log()
  console.log(`Claude Sonnet 4.5:`)
  console.log(`  Input tokens:          ${totalInputTokens.toLocaleString()}`)
  console.log(`  Output tokens:         ${totalOutputTokens.toLocaleString()}`)
  console.log(`  Costo (exacto):        ${fmtUsd(totalClaude)}`)
  console.log()
  console.log(`OpenAI (estimación grosso modo):`)
  console.log(`  TTS chars:             ${totalAssistantChars.toLocaleString()}`)
  console.log(`  TTS costo est:         ${fmtUsd(totalTtsEst)}`)
  console.log(`  Whisper min est:       ${fmt(totalWhisperMinEst, 1)} min`)
  console.log(`  Whisper costo est:     ${fmtUsd(totalWhisperEst)}`)
  console.log(`  ⚠️  Para costo OpenAI REAL → platform.openai.com/usage`)
  console.log()
  console.log(`💰 COSTO TOTAL ESTIMADO: ${fmtUsd(totalClaude + totalTtsEst + totalWhisperEst)}`)
  console.log(`   (Claude exacto + OpenAI estimado)\n`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
