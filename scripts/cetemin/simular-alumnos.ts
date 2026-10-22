/**
 * Alumnos simulados para probar el Monitor y el reporte por sesión (21 oct 2026).
 *
 * Crea una sección «Práctica (simulados)» en el curso de la lección, matricula
 * alumnos ficticios (correo @simulado.local, rol STUDENT) y cada uno hace la
 * lección con su PROPIA sesión, por las rutas de siempre (/api/chat/welcome y
 * /api/chat/stream), entrando con su correo (auth.ts lo permite solo en
 * desarrollo para @simulado.local). Así el Monitor los ve en vivo mientras
 * escriben. Las respuestas del alumno las escribe un modelo con un perfil.
 *
 * Requiere el servidor de desarrollo en http://localhost:3000.
 *
 *   npx tsx scripts/cetemin/simular-alumnos.ts <lessonId> [perfil ...]        # uno tras otro, sin pausas
 *   npx tsx scripts/cetemin/simular-alumnos.ts <lessonId> --en-vivo [--ritmo 60]
 *       # los tres a la vez, como una clase: cada alumno espera ~ritmo segundos entre mensajes
 *   npx tsx scripts/cetemin/simular-alumnos.ts si-altoriesgo/1 bueno:12 apurado:45 atascado:75 --en-vivo
 *       # ritmo propio por alumno (segundos), para ver a la vez uno por terminar, uno a medias y uno atascado
 *
 * La lección se nombra por id o como <slug del curso>/<número de sesión>. El servidor local y
 * producción comparten la base, así que una clase corrida acá se ve en el Monitor de producción.
 *   npx tsx scripts/cetemin/simular-alumnos.ts --limpiar <lessonId>           # borra a los simulados y su sección
 *
 * La transcripción de cada perfil queda en logs/simulados/<perfil>.md.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { lineasDelTexto } from '../../lib/subrayado'
import { getActivityBlocks } from '../../lib/support-blocks'
import type { Activity, LessonContent, SupportBlock } from '../../types/lesson'

for (const l of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
// Después de leer el .env: el cliente toma ANTHROPIC_API_KEY al construirse.
const anthropic = new Anthropic()

const BASE = 'http://localhost:3000'
const DOMINIO = 'simulado.local'
const SECCION = 'Práctica (simulados)'
const SALIDA = join(process.cwd(), 'logs', 'simulados')

/** Perfil → quién es y cómo responde. Los nombres son inventados. `turnos` limita cuántos mensajes escribe (se va antes de terminar). */
const PERFILES: Record<string, { nombre: string; persona: string; turnos?: number }> = {
  bueno: {
    nombre: 'Milagros Huamán',
    persona:
      'Técnica con algunos años en obra. Lee la pizarra con atención antes de responder. Responde con una decisión clara y su razón, aplicada al caso que te preguntan, en 2 o 3 oraciones. Cuando hay un texto para subrayar, subrayas la línea que respalda tu respuesta.',
  },
  apurado: {
    nombre: 'Jhon Quispe',
    persona:
      'Alumno con prisa que se conecta desde el celular. NUNCA escribes más de 12 palabras: una decisión sin la razón, o solo «ok», «listo», «sí», «ya». Si Sophia te pide la razón, das una de tres palabras. Si te piden subrayar, subrayas cualquier línea y escribes «listo». Nunca lees la pizarra completa.',
    turnos: 9,
  },
  flojo: {
    nombre: 'Brayan Condori',
    persona:
      'Alumno nuevo, poco seguro. Respuestas cortas de 3 a 10 palabras. A veces dices «no sé». Crees que por debajo de 1,80 m nunca es trabajo en altura y que el casco basta contra lo que cae. Dictas por voz y salen errores de transcripción («la g 50», «metro 80», «1 m 20»). No subrayas nada salvo que Sophia te lo pida, y entonces a veces subrayas una línea que no corresponde.',
  },
  atascado: {
    nombre: 'Luis Ccahuana',
    persona:
      'Alumno que no entiende y no lo sabe. Respondes con seguridad pero equivocado: crees que trabajo en altura es solo desde 1,80 m sin excepciones, que el umbral es igual en todos los rubros, que una baranda de 60 cm basta y que el casco protege de todo lo que cae. Nunca das la razón que te piden: repites la misma idea con otras palabras. Respuestas de 5 a 12 palabras. Si te piden subrayar, subrayas la primera línea [0] y escribes «listo».',
  },
  equivoca: {
    nombre: 'Yesenia Mamani',
    persona:
      'Alumna que responde bien por escrito, con decisión y razón aplicadas al caso. Pero cuando hay un texto para subrayar, SIEMPRE subrayas la línea que habla de minería (la que menciona el D.S. 024 y 1,80 m), aunque Sophia te pida cambiarla; después escribes «listo».',
  },
}

const correoDe = (perfil: string) => `${perfil}@${DOMINIO}`
const hora = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' })
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

type Turno = { quien: 'Sophia' | 'Alumno'; texto: string; actividad: string | null; nota?: string }

/** Entra como el alumno simulado (en desarrollo, el proveedor test-user acepta correos @simulado.local). */
async function login(email: string): Promise<string> {
  const jar = new Map<string, string>()
  const guardar = (r: Response) => {
    for (const c of r.headers.getSetCookie()) {
      const [par] = c.split(';')
      const i = par.indexOf('=')
      jar.set(par.slice(0, i), par.slice(i + 1))
    }
  }
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const csrf = await fetch(`${BASE}/api/auth/csrf`)
  guardar(csrf)
  const { csrfToken } = (await csrf.json()) as { csrfToken: string }
  const r = await fetch(`${BASE}/api/auth/callback/test-user`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, callbackUrl: `${BASE}/lessons` }),
  })
  guardar(r)
  if (![...jar.keys()].some((k) => k.includes('session-token'))) throw new Error(`sin sesión para ${email} (status ${r.status}); ¿está corriendo npm run dev?`)
  return cookie()
}

function pizarra(act: Activity | undefined): { texto: string; subrayable: { id: string; lineas: string[] } | null } {
  if (!act) return { texto: '(vacía)', subrayable: null }
  let subrayable: { id: string; lineas: string[] } | null = null
  const partes = getActivityBlocks(act).map((b: SupportBlock) => {
    if (b.type === 'image') return `IMAGEN «${b.title}»: ${b.description}`
    if (b.type === 'case') return `CASO «${b.title}»: ${b.name}. ${b.facts.join(' · ')}${b.question ? ` Pregunta: ${b.question}` : ''}`
    if (b.type === 'text') {
      const lineas = lineasDelTexto(b.body)
      if (b.subrayable) subrayable = { id: b.id, lineas }
      return `TEXTO «${b.title}»${b.subrayable ? ' (puedes subrayar líneas por número)' : ''}:\n${lineas.map((l, i) => `  [${i}] ${l}`).join('\n')}`
    }
    return `${b.type.toUpperCase()} «${b.title}»`
  })
  return { texto: partes.join('\n') || '(vacía)', subrayable }
}

async function leerSSE(r: Response): Promise<{ texto: string; eventos: string[] }> {
  const dec = new TextDecoder()
  let buf = ''
  let texto = ''
  const eventos: string[] = []
  for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const linea = buf.slice(0, i).trim()
      buf = buf.slice(i + 2)
      if (!linea.startsWith('data:')) continue
      try {
        const d = JSON.parse(linea.slice(5).trim())
        if (d.type === 'content') texto += d.text
        else if (d.type && d.type !== 'done') eventos.push(d.type)
      } catch {
        /* línea parcial */
      }
    }
  }
  return { texto, eventos }
}

/** Lo que el alumno escribe a continuación, según su perfil y lo que ve. */
async function siguienteMensaje(perfil: string, vista: ReturnType<typeof pizarra>, turnos: Turno[]) {
  const historia = turnos.slice(-12).map((t) => `${t.quien === 'Sophia' ? 'Sophia' : 'Tú'}: ${t.texto}`).join('\n\n')
  // La respuesta sale por una herramienta: así el JSON siempre es válido (con
  // texto libre, una comilla dentro de la respuesta rompía el parseo y el
  // alumno mandaba el JSON crudo al chat).
  const pedido = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: `Interpretas a un estudiante adulto de un instituto técnico peruano en una clase con una tutora de IA llamada Sophia. PERFIL: ${PERFILES[perfil].persona}
Escribe en español peruano informal (nunca modismos chilenos ni argentinos), sin formato ni markdown. Usa "subrayar" solo cuando hay un TEXTO subrayable en la pizarra y decides tocar líneas (según tu perfil); si no, mándalo vacío.`,
    tools: [
      {
        name: 'responder',
        description: 'Tu siguiente mensaje para Sophia.',
        input_schema: {
          type: 'object',
          properties: {
            texto: { type: 'string', description: 'Lo que escribes en la caja de respuesta.' },
            subrayar: { type: 'array', items: { type: 'integer' }, description: 'Números de las líneas que tocas en el texto subrayable de la pizarra; vacío si no tocas ninguna.' },
          },
          required: ['texto', 'subrayar'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'responder' },
    messages: [{ role: 'user', content: `PIZARRA AHORA:\n${vista.texto}\n\nCONVERSACIÓN:\n${historia}\n\nEscribe tu siguiente mensaje para Sophia.` }],
  })
  const uso = pedido.content.find((c) => c.type === 'tool_use')
  const entrada = (uso?.type === 'tool_use' ? uso.input : {}) as { texto?: unknown; subrayar?: unknown }
  const texto = String(entrada.texto ?? '').trim() || 'no sé'
  const marcar = Array.isArray(entrada.subrayar) ? entrada.subrayar.filter((x): x is number => Number.isInteger(x)) : null
  return { texto, marcar }
}

type Opciones = { lessonId: string; acts: Activity[]; sectionId: string; ritmo: number }
type Pedido = { perfil: string; ritmo: number | null }

/**
 * La lección de un alumno, con su propia sesión (no es de prueba: el Monitor la
 * cuenta desde el primer mensaje). Con `ritmo` > 0, espera entre mensajes como
 * una persona; si no, va de corrido.
 */
async function simular(perfil: string, alumnoId: string, o: Opciones): Promise<string> {
  const { nombre, turnos: tope = 30 } = PERFILES[perfil]
  const cookie = await login(correoDe(perfil))
  const sesion = await prisma.lessonSession.create({
    data: { userId: alumnoId, lessonId: o.lessonId, sectionId: o.sectionId, sessionAttempt: 1, startedAt: new Date(), lastActivityAt: new Date(), activityId: o.acts[0].id, isTest: false },
    select: { id: true },
  })
  const sessionId = sesion.id
  const turnos: Turno[] = []
  let subrayado: Record<string, { lineas: number[] }> = {}
  const actual = async () => {
    const s = await prisma.lessonSession.findUnique({ where: { id: sessionId }, select: { activityId: true, completedAt: true } })
    return { id: s?.activityId ?? null, terminada: !!s?.completedAt }
  }
  const indice = (id: string | null) => (id ? o.acts.findIndex((a) => a.id === id) + 1 : 0)
  const pausa = () => (o.ritmo > 0 ? esperar(o.ritmo * 1000 * (0.5 + Math.random())) : esperar(1500))

  const w = await fetch(`${BASE}/api/chat/welcome`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ sessionId, comoEstudiante: true }) })
  turnos.push({ quien: 'Sophia', texto: await w.text(), actividad: (await actual()).id })
  console.log(`[${hora()}] ${nombre}: entró a la sesión ${sessionId}`)

  for (let n = 0; n < tope; n++) {
    await pausa()
    const est = await actual()
    if (est.terminada) break
    const vista = pizarra(o.acts.find((a) => a.id === est.id))
    const { texto, marcar } = await siguienteMensaje(perfil, vista, turnos)
    let nota: string | undefined
    if (marcar?.length && vista.subrayable) {
      subrayado = { ...subrayado, [vista.subrayable.id]: { lineas: marcar } }
      nota = `subrayó [${marcar.join(', ')}]`
    }
    turnos.push({ quien: 'Alumno', texto, actividad: est.id, nota })
    console.log(`[${hora()}] ${nombre} · Act ${indice(est.id)}/${o.acts.length}: «${texto.slice(0, 70)}${texto.length > 70 ? '…' : ''}»${nota ? ` · ${nota}` : ''}`)

    let r: Response
    for (;;) {
      r = await fetch(`${BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ sessionId, message: texto, materialState: subrayado, comoEstudiante: true }),
      })
      if (r.status !== 429) break
      await esperar(30000)
    }
    const { texto: respuesta, eventos } = r.ok ? await leerSSE(r) : { texto: `[HTTP ${r.status}] ${await r.text()}`, eventos: [] }
    if (!r.ok) console.log(`[${hora()}] ${nombre}: ${respuesta.slice(0, 160)}`)
    const despues = await actual()
    turnos.push({ quien: 'Sophia', texto: respuesta, actividad: despues.id, nota: eventos.length ? `eventos: ${eventos.join(', ')}` : undefined })
    // El instructor terminó el bloque (mensaje fijo de lib/ventana-alumno.ts): el alumno se retira.
    if (respuesta.startsWith('El bloque con Sophia terminó')) {
      console.log(`[${hora()}] ${nombre}: el instructor terminó el bloque; se retira en la actividad ${indice(despues.id)}`)
      break
    }
  }

  mkdirSync(SALIDA, { recursive: true })
  writeFileSync(
    join(SALIDA, `${perfil}.md`),
    [`# ${nombre} (${perfil}) · sesión ${sessionId}`, '', ...turnos.map((t) => `**${t.quien}** _(${t.actividad ?? '—'})_${t.nota ? ` · ${t.nota}` : ''}\n\n${t.texto}\n`)].join('\n'),
  )
  const s = await prisma.lessonSession.findUniqueOrThrow({ where: { id: sessionId }, select: { completedAt: true, grade: true, _count: { select: { messages: true } } } })
  console.log(`[${hora()}] ${nombre}: ${s._count.messages} mensajes · ${s.completedAt ? `terminó · nota ${s.grade ?? '—'}` : `se fue en la actividad ${indice((await actual()).id)}`}`)
  return sessionId
}

/** «cmv…» tal cual, o «si-altoriesgo/1»: la sesión n del curso con ese slug. */
async function resolverLeccion(nombre: string): Promise<string> {
  if (!nombre.includes('/')) return nombre
  const [slug, n] = nombre.split('/')
  const l = await prisma.lesson.findFirst({ where: { course: { slug, deletedAt: null }, order: Number(n) }, select: { id: true, title: true } })
  if (!l) throw new Error(`no hay sesión ${n} en el curso ${slug}`)
  return l.id
}

async function limpiar(lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { courseId: true } })
  const usuarios = await prisma.user.findMany({ where: { email: { endsWith: `@${DOMINIO}` } }, select: { id: true, email: true } })
  const ids = usuarios.map((u) => u.id)
  const sesiones = await prisma.lessonSession.deleteMany({ where: { userId: { in: ids } } })
  const seccion = await prisma.section.findFirst({ where: { courseId: lesson.courseId, name: SECCION }, select: { id: true } })
  if (seccion) {
    await prisma.enrollment.deleteMany({ where: { sectionId: seccion.id } })
    await prisma.sectionLessonSchedule.deleteMany({ where: { sectionId: seccion.id } })
    await prisma.section.delete({ where: { id: seccion.id } })
  }
  await prisma.enrollment.deleteMany({ where: { userId: { in: ids } } })
  await prisma.seguimientoAlumno.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`Borrados: ${usuarios.length} alumnos simulados, ${sesiones.count} sesiones${seccion ? ' y la sección de práctica' : ''}.`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--limpiar') {
    if (!args[1]) throw new Error('falta el lessonId')
    await limpiar(await resolverLeccion(args[1]))
    return
  }
  const enVivo = args.includes('--en-vivo')
  const iRitmo = args.indexOf('--ritmo')
  const ritmo = enVivo ? (iRitmo >= 0 ? Number(args[iRitmo + 1]) || 60 : 60) : 0
  const posicionales = args.filter((a, i) => !a.startsWith('--') && !(iRitmo >= 0 && i === iRitmo + 1))
  const [nombreLeccion, ...crudos] = posicionales
  if (!nombreLeccion) throw new Error('uso: simular-alumnos.ts <lessonId | curso/n> [perfil[:segundos] ...] [--en-vivo [--ritmo 60]]')
  const lessonId = await resolverLeccion(nombreLeccion)
  // «perfil» o «perfil:segundos» (ritmo propio, solo en vivo).
  const pedidos: Pedido[] = (crudos.length ? crudos : ['bueno', 'apurado', 'flojo']).map((c) => {
    const [perfil, seg] = c.split(':')
    return { perfil, ritmo: seg ? Number(seg) || null : null }
  })
  for (const { perfil } of pedidos) if (!PERFILES[perfil]) throw new Error(`perfil desconocido: ${perfil} (${Object.keys(PERFILES).join(', ')})`)
  const perfiles = pedidos.map((p) => p.perfil)

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { id: true, title: true, contentJson: true, course: { select: { id: true, title: true, careerId: true, sections: { where: { isArchived: false }, select: { periodId: true, sedeId: true }, take: 1 } } } },
  })
  const acts = (lesson.contentJson as unknown as LessonContent).activities

  // La sección de práctica: mismo periodo y sede que la primera sección real del curso.
  const ref = lesson.course.sections[0]
  const periodo = ref?.periodId ?? (await prisma.academicPeriod.findFirstOrThrow({ where: { isActive: true }, select: { id: true } })).id
  let seccion = await prisma.section.findFirst({ where: { courseId: lesson.course.id, name: SECCION }, select: { id: true } })
  if (!seccion) {
    seccion = await prisma.section.create({ data: { name: SECCION, courseId: lesson.course.id, periodId: periodo, sedeId: ref?.sedeId ?? null }, select: { id: true } })
  }
  // La ventana de hoy para esta lección: abrió hace cinco minutos y dura 2 h, así la clase está «en curso».
  const abreEn = new Date(Date.now() - 5 * 60_000)
  await prisma.sectionLessonSchedule.upsert({
    where: { sectionId_lessonId: { sectionId: seccion.id, lessonId } },
    // Reabre aunque el instructor la haya terminado con el botón en la corrida anterior.
    update: { availableAt: abreEn, closesAfterHours: 2, closedAt: null, closedById: null },
    create: { sectionId: seccion.id, lessonId, availableAt: abreEn, closesAfterHours: 2 },
  })

  const opciones: Opciones = { lessonId, acts, sectionId: seccion.id, ritmo }
  const preparar = async (perfil: string) => {
    const { nombre } = PERFILES[perfil]
    const alumno = await prisma.user.upsert({
      where: { email: correoDe(perfil) },
      update: { name: `${nombre} (simulado)` },
      create: { email: correoDe(perfil), name: `${nombre} (simulado)`, role: 'STUDENT', careerId: lesson.course.careerId, sedeId: ref?.sedeId ?? null, admissionPeriodId: periodo, emailVerified: new Date() },
      select: { id: true },
    })
    await prisma.enrollment.upsert({ where: { userId_sectionId: { userId: alumno.id, sectionId: seccion!.id } }, update: {}, create: { userId: alumno.id, sectionId: seccion!.id } })
    // Un alumno simulado tiene UNA sesión por lección: volver a correr el perfil la reemplaza.
    const borradas = await prisma.lessonSession.deleteMany({ where: { userId: alumno.id, lessonId } })
    if (borradas.count) console.log(`[${hora()}] ${nombre}: se reemplaza su sesión anterior`)
    return alumno.id
  }

  console.log(`${enVivo ? `Clase en vivo (ritmo ~${ritmo} s por mensaje)` : 'Simulación de corrido'} · ${lesson.course.title} · ${lesson.title} · ${pedidos.map((p) => (p.ritmo ? `${p.perfil} (${p.ritmo} s)` : p.perfil)).join(', ')}`)
  if (enVivo) {
    // Entran escalonados, como en una clase real, y conversan a la vez.
    await Promise.all(
      pedidos.map(async ({ perfil, ritmo: propio }, i) => {
        const alumnoId = await preparar(perfil)
        await esperar(i * 40_000)
        await simular(perfil, alumnoId, { ...opciones, ritmo: propio ?? ritmo })
      })
    )
  } else {
    for (const perfil of perfiles) {
      const alumnoId = await preparar(perfil)
      await simular(perfil, alumnoId, opciones)
    }
  }
  console.log(`\nListo. Sección «${SECCION}» del curso ${lesson.course.title}. Monitor en vivo: /dashboard/${lesson.course.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
