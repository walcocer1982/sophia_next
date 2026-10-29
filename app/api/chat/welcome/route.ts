import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { allLessonBlocks, blocksForActivity, getActivityBlocks } from '@/lib/support-blocks'
import { createMarkerFilter, unBloqueNuevoPorMensaje } from '@/lib/material-markers'
import { crearCorrectorDeVoseo } from '@/lib/voseo'
import { crearCorrectorDeTitulos } from '@/lib/titulos-material'
import { prisma } from '@/lib/prisma'
import { cierreParaAlumno, mensajeBloqueCerrado, ventanaPaso } from '@/lib/ventana-alumno'
import { anthropic, TUTOR_MODEL } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { getFirstActivity, getCurrentActivity, getLessonContext } from '@/lib/lesson-parser'
import { buildSystemPrompt } from '@/lib/prompt-builder'
import { guiaDelRol } from '@/lib/perfil-curso'
import { choiceOrder, renderChoice } from '@/lib/choice'
import type { LessonContent } from '@/types/lesson'

export const runtime = 'nodejs'

/**
 * POST /api/chat/welcome
 * Genera mensaje de bienvenida con streaming para una sesión de lección
 */
export async function POST(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { sessionId, comoEstudiante } = (await request.json()) as { sessionId?: string; comoEstudiante?: boolean }

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 })
    }

    // Get lesson info with course data
    const lessonSession = await prisma.lessonSession.findFirst({
      where: {
        id: sessionId,
        userId: session.userId,
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            objective: true,
            keyPoints: true,
            courseId: true,
            availableAt: true,
            closesAfterHours: true,
            course: {
              select: {
                instructor: true,
                methodology: true,
              },
            },
          },
        },
      },
    })

    if (!lessonSession) {
      return new Response('Session not found', { status: 404 })
    }
    // Bloque terminado o ventana vencida (22 oct 2026): sin bienvenida del modelo.
    if (!lessonSession.isTest && !lessonSession.completedAt) {
      const cierre = await cierreParaAlumno(session.userId, lessonSession.lesson)
      if (cierre && ventanaPaso(cierre)) {
        return new Response(mensajeBloqueCerrado(cierre), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    }
    // Material sin validar: solo en la prueba vista como instructor. En «Probar
    // como estudiante» (lib/vista-estudiante.ts) se oculta, como para el alumno.
    const verSinValidar = lessonSession.isTest && comoEstudiante !== true

    // El saludo con nombre era del kiosko (registro del visitante). En /learn
    // Sophia no personaliza el saludo.
    const participantFirstName: string | null = null

    // Obtener contenido de la lección
    const contentJson = await getLessonContent(lessonSession.lesson.id) as LessonContent

    if (!contentJson) {
      return new Response('Lesson content not found', { status: 404 })
    }

    // Datos del curso para el prompt
    const courseInstructor = lessonSession.lesson.course?.instructor || 'Eres un instructor experto y amable.'
    const lessonTitle = lessonSession.lesson.title
    const lessonObjective = lessonSession.lesson.objective || ''
    const lessonKeyPoints = lessonSession.lesson.keyPoints || []

    // Actividad con la que arranca la sesión: la que marca el puntero (modo
    // prueba puede empezar desde una intermedia) o, si no hay, la primera.
    const firstActivity = lessonSession.activityId
      ? { activityId: lessonSession.activityId }
      : getFirstActivity(contentJson)

    if (!firstActivity) {
      return new Response('No activities found in lesson', { status: 500 })
    }

    // Obtener contexto completo de la actividad
    const firstActivityContext = getCurrentActivity(
      contentJson,
      firstActivity.activityId,
      lessonTitle,
      lessonObjective,
      lessonKeyPoints,
      courseInstructor
    )

    if (!firstActivityContext) {
      return new Response('Activity context not found', { status: 500 })
    }

    // Obtener contexto de lección (normativo/técnico) si existe
    const lessonContext = getLessonContext(contentJson)

    // Usar el sistema de prompts completo con cache
    const methodology = lessonSession.lesson.course?.methodology ?? 'REFLECTIVE'
    const isCodeMethodology = methodology === 'CODE'

    const { staticBlocks, dynamicPrompt } = buildSystemPrompt({
      activityContext: firstActivityContext,
      recentMessages: [],
      tangentCount: 0,
      lessonContext,
      methodology,
      sessionSeed: lessonSession.id,
      pinnedBlocks: blocksForActivity(contentJson, firstActivity.activityId, verSinValidar).pinned,
      isTest: verSinValidar,
    })

    // La bienvenida PLANTEA la actividad 1 (decisión del 5 oct 2026). Antes
    // hacía una pregunta genérica de experiencia previa, y la respuesta a esa
    // pregunta se verificaba contra los criterios de la actividad 1: ese era
    // el embudo de la primera actividad en todas las lecciones.
    const primera = firstActivityContext.activity
    // En una sesión de curso la conducta viene del rol (lib/perfil-curso.ts); la
    // instrucción trae solo el contenido.
    const instruccionPropia = primera.teaching?.agent_instruction ||
      (primera as { agent_instruction?: string }).agent_instruction || ''
    const primeraInstruccion = primera.rol ? `${guiaDelRol(primera.rol)}\n${instruccionPropia}` : instruccionPropia
    const primerChoice = primera.choice
    const primerChoiceText = primerChoice
      ? renderChoice(primerChoice, choiceOrder(`${lessonSession.id}:${primera.id}`, primerChoice.options.length))
      : null
    // Si el caso o el material de la primera actividad está en el panel, la
    // bienvenida remite a él y no lo recita: en EVA-NOTA (6 oct) copiaba al
    // chat los cinco datos de Luis que el alumno ya tenía a la vista.
    // También cuenta lo fijado de actividades anteriores: al probar desde «Me
    // pregunto» (21 oct 2026), la foto venía fijada de «Veo», esto daba falso
    // y la bienvenida describía la foto entera.
    const materialEnPanel =
      getActivityBlocks(primera).length > 0 ||
      blocksForActivity(contentJson, firstActivity.activityId, verSinValidar).pinned.length > 0
    const presentarMaterial = materialEnPanel
      ? 'El caso y el material están en la PIZARRA del estudiante (ver MATERIAL DE APOYO): remite a ellos por su título («mira el caso de … en la pizarra»), NUNCA digas «el panel» ni «abajo», y NO copies sus datos en el mensaje'
      : 'Presenta el caso o material que haga falta'
    const cierreDeBienvenida = isCodeMethodology
      ? '3. Anticipa que es una guía paso a paso y pregunta si está listo para empezar el primer paso (1 oración)'
      : primerChoiceText
        ? `3. Entra DIRECTO a la primera actividad siguiendo esta instrucción: "${primeraInstruccion}". ${presentarMaterial} y termina con esta PREGUNTA CERRADA, copiada tal cual (opciones con letra, una por línea), pidiendo que elija una letra. NO hagas la pregunta abierta todavía.
PREGUNTA CERRADA:
${primerChoiceText}`
        : `3. Entra DIRECTO a la primera actividad siguiendo esta instrucción: "${primeraInstruccion}". ${presentarMaterial} y termina con esta pregunta, ${primera.rol ? 'tal cual' : 'reformulada en tus palabras pero sin cambiar lo que pide'}: "${primera.teaching?.first_question ?? primera.verification.question}"${primera.teaching?.first_question ? '. NO hagas todavía la pregunta del porqué: llega después, cuando el estudiante haya movido o mirado la pizarra' : ''}`

    // Instrucción para mensaje de bienvenida - Presenta el tema e invita a aprender
    const greetingLine = participantFirstName
      ? `"Hola ${participantFirstName}, soy Sophia, tu instructora para esta lección sobre..."`
      : `"Hola, soy Sophia, tu instructora para esta lección sobre..."`

    const welcomeInstruction = `PRIMER MENSAJE DE LA LECCIÓN — CONVERSACIONAL PARA VOZ.

IDENTIDAD: Eres Sophia, instructora educativa (mujer).

${participantFirstName ? `NOMBRE DEL ESTUDIANTE: "${participantFirstName}". Salúdalo por su primer nombre.` : ''}

TAREA: Genera un mensaje de bienvenida CONVERSACIONAL para la lección "${lessonTitle}".

OBJETIVO DE LA LECCIÓN (parafrasea en 1 oración natural — preservando cantidad y estructura, NO copies literal):
"${lessonObjective}"

REGISTRO (OBLIGATORIO): Es una CAPACITACIÓN TÉCNICA para adultos profesionales.
Tono profesional, cálido y claro, NO infantil. Español neutro con TUTEO peruano
("tú", "mira", "fíjate") — PROHIBIDO el voseo argentino ("vos", "tenés", "querés",
"mirá", "dale") y diminutivos de cuento ("de a poquito").

REGLAS CRÍTICAS DE FORMATO (este texto se va a leer en VOZ ALTA):
- TEXTO PLANO. NO uses asteriscos (**), guiones (-), numeración (1. 2. 3.), ni markdown.
- NO uses "Objetivo:" ni "Puntos clave:" como títulos sueltos. Intégralos en oraciones naturales.
- NO uses listas estructuradas. Habla de forma fluida y natural.

⛔ DISTINCIÓN CLAVE — qué SÍ y qué NO mencionar del objetivo:

✅ SÍ MENCIONA (estructura cuantitativa que comunica EL ALCANCE de la lección):
- Cantidades ("las 5 fases", "los 3 pasos", "dos métodos principales")
- Categorías genéricas ("el ciclo", "el proceso", "las etapas")
- Verbos del objetivo ("identificar", "reconocer", "entender", "aplicar")

❌ NO SPOILEES (los NOMBRES específicos que el estudiante debe descubrir):
- Lista literal de items ("perforación, voladura, ventilación...")
- Nombres propios técnicos ("jumbo electrohidráulico, jackleg")
- El contenido dentro de paréntesis del objetivo (ej: "(A → B → C)" — sáltatelo)

EJEMPLO CORRECTO (menciona "las 5 fases" sin listar cuáles):
"Hola Walther, soy Sophia. Hoy vamos a explorar el ciclo de minado subterráneo: vas a poder identificar las 5 fases que se repiten cada vez que el túnel avanza y entender por qué siempre se hacen en el mismo orden. Cuéntame, ¿has trabajado antes en minería subterránea o es la primera vez que te acercas al tema?"

EJEMPLO INCORRECTO #1 (DEMASIADO VAGO — perdió el objetivo):
"Hola Walther, hoy vamos a hablar de los pasos clave de la minería..." ← no comunicó cuántas fases ni que es un ciclo

EJEMPLO INCORRECTO #2 (SPOILEA respuestas):
"...las cinco fases son perforación, voladura, ventilación, sostenimiento y limpieza..." ← listó los nombres antes de preguntarle

LARGO TOTAL: saludo y objetivo en 2 oraciones; después la primera actividad en lo que necesite (máximo 120 palabras en total).

ESTRUCTURA:
1. Saludo + presentación (1 oración) — di ${greetingLine}
2. Parafrasea el OBJETIVO de la lección de forma genérica (1 oración, sin spoiler de respuestas)
${cierreDeBienvenida}

${materialEnPanel
  ? 'DATOS DEL CASO: están en la pizarra, a la vista del estudiante. No los enumeres: nombra el caso por su título y, como mucho, el dato que necesita la pregunta.'
  : 'DATOS DEL CASO: si la instrucción de la primera actividad dice presentar un caso con sus datos (notas, faltas, entregas, horas), inclúyelos TODOS y textuales. No son spoilers: sin ellos el estudiante no puede responder ni justificar. La regla de "no spoilear" aplica solo a las RESPUESTAS de la lección, nunca a los datos de un caso.'}

REGLA FINAL OBLIGATORIA: el mensaje DEBE terminar con la pregunta de la primera actividad. NO preguntes si está listo, NO preguntes por experiencia previa: eso retrasa la clase y la respuesta no se puede evaluar.
EXCEPCIÓN DE FORMATO: si hay PREGUNTA CERRADA, sus opciones SÍ van una por línea con su letra (A), B), C)…), aunque el resto sea texto plano.

NO asumas el género del estudiante. Usa formas neutras.

Genera el mensaje ahora, sin formato, conversacional.`

    // Marcadores del panel en la bienvenida: un bloque de la lección se puede
    // mostrar; un señalamiento nunca (el alumno todavía no respondió nada).
    const bloquesDeLaLeccion = allLessonBlocks(contentJson, verSinValidar)
    const idsDeLaLeccion = new Set(bloquesDeLaLeccion.map((b) => b.id))
    // Un solo bloque oculto por mensaje, como en el chat (unBloqueNuevoPorMensaje).
    const ocultosAlInicio = new Set(bloquesDeLaLeccion.filter((b) => (b.showWhen ?? 'on_start') !== 'on_start').map((b) => b.id))
    const filtroMarcadores = createMarkerFilter(
      unBloqueNuevoPorMensaje((kind, id) => kind === 'block' && idsDeLaLeccion.has(id), (id) => !ocultosAlInicio.has(id)),
    )
    const correctorVoseo = crearCorrectorDeVoseo()
    // Títulos del material entre «» (lib/titulos-material.ts): «la fotografía Obra en losa».
    const correctorTitulos = crearCorrectorDeTitulos(bloquesDeLaLeccion.map((b) => b.title))

    // Stream response from Claude con bloques cacheables
    const stream = await anthropic.messages.stream({
      model: TUTOR_MODEL,
      max_tokens: 600,
      system: [
        ...staticBlocks,
        { type: 'text', text: dynamicPrompt }
      ],
      messages: [{ role: 'user', content: welcomeInstruction }],
    })

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              // Voseo corregido en el código (lib/voseo.ts): «Mirá» → «Mira».
              const text = correctorTitulos.push(correctorVoseo.push(filtroMarcadores.push(chunk.delta.text)))
              if (!text) continue
              fullContent += text
              controller.enqueue(encoder.encode(text))
            }
          }
          const restoMarcadores = correctorTitulos.push(correctorVoseo.push(filtroMarcadores.flush()) + correctorVoseo.flush()) + correctorTitulos.flush()
          if (restoMarcadores) {
            fullContent += restoMarcadores
            controller.enqueue(encoder.encode(restoMarcadores))
          }

          // Get final message data
          const finalMessage = await stream.finalMessage()
          inputTokens = finalMessage.usage.input_tokens
          outputTokens = finalMessage.usage.output_tokens

          // Check if welcome message already exists
          const existingWelcome = await prisma.message.findFirst({
            where: {
              sessionId,
              role: 'assistant',
            },
            select: { id: true },
          })

          if (existingWelcome) {
            logger.warn('chat.welcome.already_exists', {
              sessionId,
              userId: session.userId,
            })
            controller.close()
            return
          }

          // Save to DB
          await prisma.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullContent,
              inputTokens,
              outputTokens,
            },
          })

          logger.info('chat.welcome.generated', {
            sessionId,
            userId: session.userId,
            inputTokens,
            outputTokens,
          })

          controller.close()
        } catch (error) {
          logger.error('chat.welcome.error', {
            sessionId,
            userId: session.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('chat.welcome.request.error', {
      userId: session?.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Response('Internal server error', { status: 500 })
  }
}
