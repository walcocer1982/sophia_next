/**
 * Alumno simulado — prueba una lección de Sophia en un Chrome visible.
 *
 * Mantiene abierta la pantalla real de /learn y recibe los turnos del alumno
 * por HTTP (puerto 4599): cada respuesta se teclea letra por letra en la caja
 * del chat y se espera a que Sophia termine. Sirve para ver la clase completa
 * tal como la vería un estudiante y dejar una transcripción con el progreso.
 * Las sesiones se crean en MODO PRUEBA (isTest) y no cuentan en el Monitor.
 *
 * Requiere: el dev server en http://localhost:3000 y un Chrome abierto con
 * depuración remota, donde ya iniciaste sesión con una cuenta ADMIN (Google no
 * acepta login en un Chrome lanzado por un script):
 *
 *   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 ^
 *     --user-data-dir=%TEMP%\sophia-alumno --no-first-run http://localhost:3000/login
 *
 * Luego, sin instalar nada en el proyecto: playwright-core en una carpeta
 * aparte y el script copiado allí (un import ESM no ve el paquete temporal de
 * `npx -p`, así que `npx -p playwright-core node scripts/…` no arranca):
 *
 *   mkdir %TEMP%\alumno && cd %TEMP%\alumno && npm init -y && npm i playwright-core@1
 *   copy <repo>\scripts\alumno-simulado.mjs . && set ALUMNO_LOG=<repo>\logs\alumno-simulado\transcripcion.md
 *   node alumno-simulado.mjs
 *
 * Turnos (desde otra terminal):
 *   curl -s localhost:4599/estado
 *   curl -s -X POST localhost:4599/iniciar -H "Content-Type: application/json" \
 *        -d '{"lessonId":"<id>","titulo":"EVA-NOTA · alumno flojo","desde":"<activityId opcional>"}'
 *   curl -s -X POST localhost:4599/decir -H "Content-Type: application/json" -d '{"texto":"la b"}'
 *   curl -s localhost:4599/panel     (material visible: bloques, señalamientos, ecualizador, botón a pedido)
 *   curl -s -X POST localhost:4599/mover -H "Content-Type: application/json" \
 *        -d '{"bloque":"ecualizador-nota","variable":"tc2","valor":0}'   (o {"bloque":…,"caso":"Ana"})
 *
 * Ojo: este proceso queda conectado al Chrome y Playwright descarta solo los
 * diálogos (confirm) de cualquier pestaña. Para probar un «¿Seguro?» del
 * planner a mano o con otro script, detén antes el conductor.
 *
 * La transcripción queda en logs/alumno-simulado/transcripcion.md (ALUMNO_LOG
 * para cambiarla). Quien escribe las respuestas puede ser una persona, Claude
 * turno por turno, o un modelo que imite un perfil de alumno.
 */
import { chromium } from 'playwright-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.SOPHIA_URL ?? 'http://localhost:3000'
const CDP = process.env.CHROME_CDP ?? 'http://localhost:9222'
const PORT = Number(process.env.ALUMNO_PORT ?? 4599)
const LOG = process.env.ALUMNO_LOG ?? path.join('logs', 'alumno-simulado', 'transcripcion.md')
fs.mkdirSync(path.dirname(LOG), { recursive: true })
const log = (s) => fs.appendFileSync(LOG, s + '\n')

const browser = await chromium.connectOverCDP(CDP)
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().startsWith(BASE)) ?? ctx.pages()[0] ?? await ctx.newPage()
if (!page.url().startsWith(BASE)) await page.goto(`${BASE}/login`)
let sessionId = null

const api = (p, init) => page.evaluate(async ([p, init]) => {
  const r = await fetch(p, init)
  return { status: r.status, body: await r.json().catch(() => null) }
}, [p, init])

async function mensajes() {
  const r = await api(`/api/session/${sessionId}/messages`)
  return r.body?.messages ?? []
}

/** Pasa a Modo Chat reintentando hasta que exista la caja de texto (la página abre en modo tutor por voz). */
async function modoChat() {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('textarea').count() > 0) return
    await page.getByRole('button', { name: 'Modo Chat' }).dispatchEvent('click', {}, { timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(1000)
  }
}

/** Espera a que Sophia termine: caja habilitada y último mensaje suyo, estable 2 s. */
async function esperarSophia(minCount, timeoutMs = 180000) {
  const t0 = Date.now(); let prev = null; let estables = 0
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(1000)
    const habilitada = await page.locator('textarea').first().isEnabled().catch(() => false)
    const ms = await mensajes()
    const ultimo = ms.at(-1)
    const firma = `${ms.length}|${ultimo?.content?.length}`
    if (habilitada && ms.length >= minCount && ultimo?.role === 'assistant') {
      estables = firma === prev ? estables + 1 : 0
      if (estables >= 2) return ms
    }
    prev = firma
  }
  throw new Error('Sophia no terminó a tiempo')
}

async function progreso() {
  const r = await api(`/api/activity/progress?sessionId=${sessionId}`)
  const b = r.body ?? {}
  return `${b.progress ?? '?'}/${b.total ?? '?'} · ${b.currentActivity ?? ''}`
}

/**
 * Lo que el alumno tiene a la vista en el panel de material: bloques (id y
 * título), señalamientos dibujados por imagen y el botón de material a pedido.
 * Sirve para dejar en la transcripción que un bloque «al citarlo» apareció en
 * el turno correcto (spec del panel §9.4).
 */
async function panel() {
  return page.evaluate(() => {
    const bloques = [...document.querySelectorAll('section[id^="block-"]')].map((s) => {
      const id = s.id.replace(/^block-/, '')
      const titulo = s.querySelector('button span')?.textContent?.trim() ?? ''
      // Ecualizador: valor de cada barra y el resultado que ve el alumno.
      const barras = [...s.querySelectorAll('input[data-variable]')]
      if (barras.length) {
        const valores = Object.fromEntries(barras.map((b) => [b.getAttribute('data-variable'), Number(b.value)]))
        const resultado = s.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        return { id, titulo, ecualizador: { valores, resultado } }
      }
      const puntos = [...s.querySelectorAll('.relative > span')].map((p) => p.textContent?.trim()).filter(Boolean)
      return puntos.length ? { id, titulo, señalamientos: puntos } : { id, titulo }
    })
    const aPedido = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ver material disponible'))?.textContent?.trim() ?? null
    return { bloques, aPedido }
  })
}
const resumenPanel = (p) =>
  p.bloques
    .map((b) =>
      b.ecualizador
        ? `${b.id} {${Object.entries(b.ecualizador.valores).map(([k, v]) => `${k} ${v}`).join(', ')} → ${b.ecualizador.resultado}}`
        : b.señalamientos ? `${b.id} [${b.señalamientos.join(',')}]` : b.id,
    )
    .join(', ') + (p.aPedido ? ` · ${p.aPedido}` : '')

/**
 * Mueve una barra del ecualizador como lo haría el alumno: valor nativo +
 * evento input (así React registra el cambio y el «último cambio» viaja a Sophia).
 */
async function moverBarra(bloque, variable, valor) {
  const barra = page.locator(`#block-${bloque} input[data-variable="${variable}"]`)
  await barra.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, valor)
}

const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj, null, 2)) }
const leer = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => d += c); req.on('end', () => ok(d ? JSON.parse(d) : {})) })

http.createServer(async (req, res) => {
  try {
    if (req.url === '/panel') {
      return json(res, 200, await panel())
    }
    if (req.url === '/mover' && req.method === 'POST') {
      // { bloque, variable, valor } — o { bloque, caso } para cargar un caso del ecualizador
      const { bloque, variable, valor, caso } = await leer(req)
      if (caso) await page.locator(`#block-${bloque}`).getByRole('button', { name: caso, exact: true }).click()
      else await moverBarra(bloque, variable, valor)
      await page.waitForTimeout(300)
      const visto = await panel()
      log(`> mueve: ${caso ? `caso ${caso}` : `${variable} → ${valor}`} · ${resumenPanel(visto)}\n`)
      return json(res, 200, visto)
    }
    if (req.url === '/estado') {
      const s = await api('/api/auth/session')
      return json(res, 200, { url: page.url(), usuario: s.body?.user ?? null, sessionId })
    }
    if (req.url === '/iniciar' && req.method === 'POST') {
      const { lessonId, desde, titulo } = await leer(req)
      if (!page.url().startsWith(BASE)) await page.goto(`${BASE}/lessons`)
      const r = await api('/api/session/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, isTest: true, startFromActivity: desde }),
      })
      if (r.status !== 200) return json(res, r.status, r.body)
      sessionId = r.body.sessionId
      await page.goto(`${BASE}/learn/${sessionId}`)
      await modoChat()
      const ms = await esperarSophia(1)
      log(`\n# ${titulo ?? lessonId} · ${new Date().toLocaleString('es-PE')} · sesión ${sessionId}\n`)
      for (const m of ms) log(`**Sophia:** ${m.content}\n`)
      return json(res, 200, { sessionId, progreso: await progreso(), sophia: ms.filter((m) => m.role === 'assistant').map((m) => m.content) })
    }
    if (req.url === '/decir' && req.method === 'POST') {
      const { texto } = await leer(req)
      await modoChat()
      const antes = (await mensajes()).length
      const caja = page.locator('textarea').first()
      await caja.click()
      await caja.pressSequentially(texto, { delay: 55 })
      await page.waitForTimeout(400)
      await caja.press('Enter')
      log(`**Alumno:** ${texto}\n`)
      const ms = await esperarSophia(antes + 2)
      const nuevos = ms.slice(antes).filter((m) => m.role === 'assistant').map((m) => m.content)
      for (const t of nuevos) log(`**Sophia:** ${t}\n`)
      const p = await progreso()
      log(`> progreso: ${p}\n`)
      const visto = await panel()
      log(`> panel: ${resumenPanel(visto) || '(vacío)'}\n`)
      return json(res, 200, { progreso: p, sophia: nuevos, panel: visto })
    }
    json(res, 404, { error: 'ruta' })
  } catch (e) { json(res, 500, { error: String(e?.message ?? e) }) }
}).listen(PORT, () => console.log(`alumno simulado listo en http://localhost:${PORT} · transcripción en ${LOG}`))
