/**
 * Seed para el curso AI 101 (carrera ENTER).
 *
 * Crea:
 *  - Carrera "ENTER" (idempotente por slug).
 *  - Curso "AI 101" (idempotente por slug; metodología CODE).
 *  - Lección "Tu Proyecto Propio" con 6 actividades (intake + 4 build + cierre).
 *
 * Ejecutar con:
 *   npx tsx scripts/seed-ai101.ts
 *
 * Idempotente: re-ejecutar actualiza el contentJson de la lección y los
 * metadatos del curso, sin duplicar nada.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COURSE_SLUG = 'ai-101'
const LESSON_SLUG = 'ai-101-tu-proyecto-propio'
const CAREER_SLUG = 'enter'

const COURSE_INSTRUCTOR = `Eres Sophia, instructora técnica de IA aplicada (mujer).
Hablas español latino, profesional pero cercana.
Enseñas a construir flujos de automatización con Make + Gemini + Google Workspace
contra el proyecto real que el estudiante trae al curso.
Nunca usas emojis genéricos, salvo los íconos de servicio que se autorizan
explícitamente para identificar cada módulo (📧 Gmail, 💬 WhatsApp, 📊 Sheets, 🧠 Gemini, ⚙️ Make, 📁 Drive, etc.).`

const KEY_POINTS = [
  'Acordar el proyecto del estudiante',
  'Configurar el módulo 1 del flujo',
  'Configurar el módulo 2 del flujo',
  'Configurar el módulo 3 del flujo',
  'Configurar el módulo 4 o prueba end-to-end',
]

const INTAKE_INSTRUCTION = `ACTIVIDAD 1 — ACUERDO DEL PROYECTO (intake conversacional).

Tu tarea: conversar con el estudiante para entender su caso real, acotarlo y producir una propuesta estructurada acordada.

⚠️ EXCEPCIÓN A LA REGLA "modo instruccional / no socrático" del bloque base:
SOLO en esta actividad necesitas HACER PREGUNTAS para acotar. NO instruyas todavía.

FLUJO:
1) Saludo breve. Pregunta abierta: "¿Qué problema quieres resolver con un flujo de IA?"
2) Una pregunta a la vez para entender:
   - Disparador: ¿qué evento dispara el flujo? (un email entra, un archivo cae en Drive, un mensaje en WhatsApp, un horario diario...)
   - Datos de entrada: ¿qué viene en ese disparador? (texto, PDF, fotos, audio)
   - Trabajo de Gemini: ¿qué necesitas que extraiga/clasifique/resuma?
   - Salida: ¿en qué Sheet termina? ¿qué columnas?
   - Archivado: ¿hay que mover/renombrar archivos? ¿cómo se organizan?
   - Participación: ¿qué hace el estudiante manualmente cada semana?
3) Cuando tengas todo claro, PROPONE la propuesta estructurada en formato conversacional (caso, cómo funciona, módulos, columnas, participación, valor). Estilo Joan/Carolina.
4) Pregunta: "¿Confirmas esta propuesta como tu proyecto? ¿Ajustamos algo?"
5) Si el estudiante CONFIRMA, cierra con UN mensaje que contenga:
   - Texto breve confirmando ("Genial, queda fijado tu proyecto. Ahora vamos a construirlo paso a paso.")
   - INMEDIATAMENTE después, el bloque marcador:

---PROJECT_BRIEF---
{
  "caso": "1-2 oraciones del problema real",
  "trigger": { "service": "drive|gmail|whatsapp|sheets|schedule|otros", "detail": "qué dispara" },
  "modulos": [
    { "n": 1, "service": "drive", "name": "Google Drive — Watch Files", "purpose": "...", "config_hint": "..." },
    { "n": 2, "service": "gemini", "name": "Gemini — Generate response", "purpose": "...", "config_hint": "..." },
    { "n": 3, "service": "...", "name": "...", "purpose": "...", "config_hint": "..." },
    { "n": 4, "service": "googlesheets", "name": "Google Sheets — Add a row", "purpose": "...", "config_hint": "..." }
  ],
  "columnas_sheet": ["columna1", "columna2", "..."],
  "archivado": "cómo se mueven/renombran archivos, si aplica",
  "participacion_semanal": "qué hace el estudiante manualmente",
  "valor": "qué gana al automatizar esto"
}
---END_PROJECT_BRIEF---

⚠️ REGLA ESTRICTA — TOPE DE 4 MÓDULOS:
El array "modulos" tiene MÁXIMO 4 elementos. Si el caso requiere más, simplifica o divide en fases.
ÚNICA excepción: si el estudiante DEMUESTRA EXPLÍCITAMENTE dominio previo de Make (menciona iteradores, filtros, ya hizo flujos antes), puedes proponer hasta 6 módulos. NO asumas dominio sin evidencia clara.

REGLAS:
- NO emitas PROJECT_BRIEF antes de que el estudiante confirme.
- NO emitas PROJECT_BRIEF dos veces; si el estudiante pide ajustes después, conversa y vuelve a proponer ANTES de re-emitir.
- Si el estudiante no tiene un proyecto claro, ayúdalo a elegir uno acotado (puedes proponerle 2-3 ideas concretas inspiradas en casos reales: facturas en PDF, mensajes de un grupo de WhatsApp, emails de un buzón, etc.).`

function buildModuleInstruction(n: 1 | 2 | 3 | 4): string {
  const ord = ['PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO'][n - 1]
  const idx = n - 1
  return `ACTIVIDAD ${n + 1} — CONFIGURAR EL ${ord} MÓDULO DEL FLUJO.

Modo instruccional (regla base de CODE). Lee el PROYECTO ACORDADO DEL ESTUDIANTE inyectado en el system prompt: identifica \`modulos[${idx}]\`.

${n === 4
  ? `⚠️ SI \`modulos[3]\` NO EXISTE (el brief tiene 3 módulos o menos): en lugar de un 4º módulo, orquesta una PRUEBA END-TO-END. Pide al estudiante que dispare el flujo completo con un caso real y pegue lo que ve en el Sheet final.`
  : ''}

TAREA:
1) Identifica el servicio del módulo y úsalo con su emoji al referirte a él (📧 Gmail, 💬 WhatsApp, 📊 Google Sheets, 🧠 Gemini, ⚙️ Make, 📁 Drive, 🤖 Slack, 📞 Telegram, otros — usa el más obvio para el servicio).
2) Instruye con el NOMBRE EXACTO del módulo en Make (ej: "Google Drive — Watch files", "Gemini — Generate response", "Tools — Parse JSON", "Google Sheets — Add a row"). Esto es CRÍTICO: el estudiante debe buscar exactamente ese nombre en Make.
3) Da la configuración mínima necesaria: campos a llenar, conexión a usar, qué valor poner en cada campo. Si es Gemini, escribe el prompt explícito que debe pegar (con placeholders del paso anterior, ej. \`{{1.text}}\`, \`{{3.image_url}}\`).
4) Indícale qué debe ver cuando esté listo (ej: "el módulo se pone verde", "se muestra un preview de la salida").
5) Pídele que CONFIRME cuando lo tenga, o que SUBA UNA CAPTURA del módulo configurado (puede usar el botón 📎 si tu interfaz lo permite).

REGLAS:
- Si el estudiante reporta un error, dale instrucciones concretas para resolverlo y continúa.
- Una instrucción a la vez. No bombardees con todos los pasos juntos.
- NO uses método socrático. NO ocultes la respuesta. Esto es instruccional.
- Concisión: la instrucción debe entrar en pocas oraciones; usa bloques de código/comandos sólo cuando aplique.

CIERRE DE LA ACTIVIDAD:
Cuando el estudiante confirme que el módulo funciona o pegue evidencia válida, validá brevemente y anuncia que pasamos al siguiente paso.`
}

const CLOSING_INSTRUCTION = `ACTIVIDAD 6 — PRUEBA END-TO-END Y CIERRE.

Modo instruccional. El flujo completo ya debería estar armado. Tu tarea:

1) Pídele al estudiante que dispare el flujo COMPLETO con un caso REAL (subir un archivo nuevo a la carpeta de entrada, enviar un mensaje al grupo, lo que aplique según su trigger).
2) Pídele que pegue:
   - Una captura del Sheet final con la fila nueva, o
   - El texto de la fila que se acaba de agregar.
3) Verifica que todas las columnas que se acordaron en el PROYECTO ACORDADO se llenan correctamente. Si hay columnas vacías o con valores raros, indícale qué módulo revisar.
4) Cuando todo esté correcto, cierra con UNA oración celebrando el flujo terminado y mencionando algo concreto del proyecto del estudiante (la placa, el proveedor, lo que aplique).

REGLAS:
- Si algo falla en el end-to-end, ayuda a depurar paso a paso (revisar el módulo problemático) — no rediseñes el flujo.
- Sin emojis salvo los íconos de servicio autorizados.`

type ActivityIn = {
  id: string
  type: 'practice' | 'closing'
  complexity: 'simple' | 'moderate'
  keyPointIndex: number | null
  agent_instruction: string
  question: string
  must_include: string[]
}

const ACTIVITIES_DEFS: ActivityIn[] = [
  {
    id: 'ai101_intake',
    type: 'practice',
    complexity: 'moderate',
    keyPointIndex: 0,
    agent_instruction: INTAKE_INSTRUCTION,
    question: 'El estudiante confirmó la propuesta y se emitió PROJECT_BRIEF con la propuesta acordada (≤4 módulos, salvo dominio explícito).',
    must_include: [
      'el estudiante dio confirmación explícita a la propuesta',
      'Sophia emitió el bloque ---PROJECT_BRIEF--- con JSON válido',
    ],
  },
  {
    id: 'ai101_module_1',
    type: 'practice',
    complexity: 'moderate',
    keyPointIndex: 1,
    agent_instruction: buildModuleInstruction(1),
    question: 'El estudiante configuró el primer módulo del flujo y lo confirmó (texto explícito o captura del módulo en Make).',
    must_include: ['confirmación de módulo 1 configurado o captura pegada'],
  },
  {
    id: 'ai101_module_2',
    type: 'practice',
    complexity: 'moderate',
    keyPointIndex: 2,
    agent_instruction: buildModuleInstruction(2),
    question: 'El estudiante configuró el segundo módulo del flujo y lo confirmó (texto explícito o captura).',
    must_include: ['confirmación de módulo 2 configurado o captura pegada'],
  },
  {
    id: 'ai101_module_3',
    type: 'practice',
    complexity: 'moderate',
    keyPointIndex: 3,
    agent_instruction: buildModuleInstruction(3),
    question: 'El estudiante configuró el tercer módulo del flujo y lo confirmó (texto explícito o captura).',
    must_include: ['confirmación de módulo 3 configurado o captura pegada'],
  },
  {
    id: 'ai101_module_4',
    type: 'practice',
    complexity: 'moderate',
    keyPointIndex: 4,
    agent_instruction: buildModuleInstruction(4),
    question: 'El estudiante configuró el cuarto módulo del flujo (o ejecutó la prueba end-to-end si el brief tenía solo 3 módulos) y confirmó.',
    must_include: ['confirmación del módulo 4 o de la prueba end-to-end'],
  },
  {
    id: 'ai101_closing',
    type: 'closing',
    complexity: 'simple',
    keyPointIndex: null,
    agent_instruction: CLOSING_INSTRUCTION,
    question: 'El estudiante ejecutó el flujo end-to-end con un caso real y confirmó que el Sheet se llena correctamente.',
    must_include: ['evidencia de ejecución end-to-end exitosa'],
  },
]

const ACTIVITIES = ACTIVITIES_DEFS.map((a) => ({
  id: a.id,
  type: a.type,
  complexity: a.complexity,
  keyPointIndex: a.keyPointIndex,
  teaching: {
    agent_instruction: a.agent_instruction,
    target_length: a.type === 'closing' ? '40-60 palabras' : '60-120 palabras',
  },
  verification: {
    question: a.question,
    success_criteria: {
      must_include: a.must_include,
      min_completeness: 70,
      understanding_level: 'applied' as const,
    },
    max_attempts: 5,
    open_ended: false,
    is_evaluative: true,
  },
}))

async function main() {
  console.log('🌱 Seed AI 101 — empezando…')

  // 1) Carrera ENTER
  const career = await prisma.career.upsert({
    where: { slug: CAREER_SLUG },
    update: { name: 'ENTER' },
    create: { slug: CAREER_SLUG, name: 'ENTER' },
  })
  console.log(`✓ Carrera: ${career.name} (${career.slug})`)

  // 2) Owner del curso: primer SUPERADMIN (o null si no hay)
  const owner = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' },
    select: { id: true, email: true },
  })
  if (!owner) {
    console.warn('⚠️ No hay SUPERADMIN — el curso se crea sin userId.')
  } else {
    console.log(`✓ Owner del curso: ${owner.email}`)
  }

  // 3) Curso AI 101 (metodología CODE)
  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    update: {
      title: 'AI 101 — Tu Proyecto Propio',
      capacidad: 'Diseñar e implementar un flujo de automatización con IA (Make + Gemini + Google Workspace) aplicado a un problema real del estudiante.',
      instructor: COURSE_INSTRUCTOR,
      methodology: 'CODE',
      careerId: career.id,
      isPublished: true,
      voiceEnabled: false, // texto, sin voz (el flujo es muy técnico)
      allowPaste: true,    // pegar configuración, salidas, JSONs
      allowImagePaste: true, // capturas de pantalla
      ...(owner ? { userId: owner.id } : {}),
    },
    create: {
      slug: COURSE_SLUG,
      title: 'AI 101 — Tu Proyecto Propio',
      capacidad: 'Diseñar e implementar un flujo de automatización con IA (Make + Gemini + Google Workspace) aplicado a un problema real del estudiante.',
      instructor: COURSE_INSTRUCTOR,
      methodology: 'CODE',
      careerId: career.id,
      isPublished: true,
      voiceEnabled: false,
      allowPaste: true,
      allowImagePaste: true,
      userId: owner?.id ?? null,
    },
  })
  console.log(`✓ Curso: ${course.title} (slug=${course.slug}, methodology=${course.methodology})`)

  // 4) Lección "Tu Proyecto Propio" con 6 actividades
  const lesson = await prisma.lesson.upsert({
    where: { slug: LESSON_SLUG },
    update: {
      title: 'Tu Proyecto Propio',
      objective: 'Acordar y construir, paso a paso, un flujo de IA en Make aplicado al caso real del estudiante.',
      keyPoints: KEY_POINTS,
      contentJson: { activities: ACTIVITIES },
      courseId: course.id,
      isPublished: true,
      order: 1,
    },
    create: {
      slug: LESSON_SLUG,
      title: 'Tu Proyecto Propio',
      objective: 'Acordar y construir, paso a paso, un flujo de IA en Make aplicado al caso real del estudiante.',
      keyPoints: KEY_POINTS,
      contentJson: { activities: ACTIVITIES },
      courseId: course.id,
      isPublished: true,
      order: 1,
    },
  })
  console.log(`✓ Lección: ${lesson.title} (${ACTIVITIES.length} actividades)`)

  console.log('\n🌱 Seed AI 101 — completado.')
}

main()
  .catch((e) => {
    console.error('❌ Seed AI 101 falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
