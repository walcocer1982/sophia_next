import { getAuthOrGuest } from '@/lib/auth-or-guest'
import { prisma } from '@/lib/prisma'
import { anthropic, TUTOR_MODEL } from '@/lib/anthropic'
import { normalizeLevel, LEVEL_LABEL_ES } from '@/lib/levels'
import { getCurrentActivity, getFirstActivity, getNextActivity, getTotalActivities, getLessonContext, getActivityById } from '@/lib/lesson-parser'
import { buildSystemPrompt, getMaxTokensForActivity } from '@/lib/prompt-builder'
import { isPassing } from '@/lib/rubric'
import { notaDeLaSesion } from '@/lib/grading'
import { checkRateLimit } from '@/lib/rate-limit'
import { detectHallucination } from '@/lib/hallucination-detector'
import { logger, logChatMessage, logError } from '@/lib/logger'
import { getLessonContent } from '@/lib/lesson-loader'
import { verifyActivityCompletion, verifyStepCompletion } from '@/lib/activity-verification'
import { applyPick, esEleccionConRazon, newChoiceState, parseChoicePick, renderChoice, type ChoiceState } from '@/lib/choice'
import { allLessonBlocks, blocksForActivity, getActivityBlocks } from '@/lib/support-blocks'
import { citedFromTexts, createMarkerFilter, stripMarkers, type MarkerCheck } from '@/lib/material-markers'
import { crearCorrectorDeVoseo } from '@/lib/voseo'
import { crearCorrectorDeTitulos } from '@/lib/titulos-material'
import { crearQuitadorDeCalificaciones, debeQuitarCalificacion } from '@/lib/calificacion'
import { crearQuitadorDePreguntas, preguntaDelTurno, preguntaEnNegrita } from '@/lib/perfil-curso'
import { planteaLaPregunta } from '@/lib/planteo'
import type { ChoiceTurn } from '@/lib/prompt-builder'
import { moderateContent, getInterventionMessage } from '@/lib/services/moderation'
import { classifyIntent } from '@/lib/services/intent-classification'
import { compressMessagesForAPI } from '@/lib/message-summarizer'
import { processPlannerAttachments } from '@/lib/planner/attachments'
import type { LessonContent, ModerationResult, IntentClassification, ActivityCompletionResult, ClassifyBlock, TextBlock } from '@/types/lesson'
import type { Message, Prisma } from '@prisma/client'
import type Anthropic from '@anthropic-ai/sdk'
import { checkReply, checksIntro, newChecksState, readCheck, type ChecksState, type CheckTurn } from '@/lib/checks'
import { describeStateForPrompt, directivaSiYaMovio, initialState, sanitizeState, type SimState } from '@/lib/simulator'
import { describeClasifForPrompt, describeClasifForVerifier, sanitizeClasif, vacio as clasificacionVacia, type ClasifState } from '@/lib/clasificar'
import { describeSubrayadoForPrompt, describeSubrayadoForVerifier, evaluarSubrayado, faltaTocarLaLinea, guiaRevelarSubrayado, guiaLineaCorrecta, leerSubrayadoGuardado, lineasClaveTexto, mensajeRecordatorioSubrayado, mensajeRevisarSubrayado, mensajeTurnoDeSubrayar, hayQueRevisarSubrayado, esRepeticionEquivocada, type UltimoSubrayado, paraGuardar, sanitizeSubrayado, sinSubrayar, subrayadasQueRespaldan, type SubrayadoState } from '@/lib/subrayado'
import { resumenDeCierre } from '@/lib/cierre'
import { pideAclaracion } from '@/lib/aclaracion'
import { mensajePideSeguir, pideSeguir } from '@/lib/pide-seguir'
import { decidirDesglose, turnosPrevios } from '@/lib/desglose'
import { cierreParaAlumno, mensajeBloqueCerrado, ventanaPaso } from '@/lib/ventana-alumno'

export const runtime = 'nodejs'
export const maxDuration = 60

// Marcador del "brief" acordado en la sesión-bisagra de cursos basados en
// proyecto (CODE personalizado). Sophia lo emite cuando el estudiante confirma
// la propuesta estructurada; el contenido entre los marcadores es JSON.
const PROJECT_BRIEF_REGEX =
  /---PROJECT_BRIEF---\s*([\s\S]*?)\s*---END_PROJECT_BRIEF---/

function extractProjectBrief(text: string): { brief: unknown | null; cleaned: string } {
  const match = text.match(PROJECT_BRIEF_REGEX)
  if (!match) return { brief: null, cleaned: text }
  try {
    const brief = JSON.parse(match[1].trim())
    const cleaned = text.replace(PROJECT_BRIEF_REGEX, '').trim()
    return { brief, cleaned }
  } catch {
    // JSON inválido — preservamos el mensaje original y no guardamos brief
    return { brief: null, cleaned: text }
  }
}


export async function POST(request: Request) {
  const session = await getAuthOrGuest()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting: 10 mensajes por minuto
  const rateLimit = checkRateLimit(session.userId, 10, 60)
  if (!rateLimit.allowed) {
    const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    logger.warn('rate_limit.exceeded', {
      userId: session.userId,
      resetIn,
    })
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Has alcanzado el límite de mensajes. Intenta de nuevo en ${resetIn} segundos.`,
        resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  }

  const {
    sessionId,
    message,
    attachments,
    materialState,
    comoEstudiante,
  } = (await request.json()) as {
    sessionId: string
    message: string
    attachments?: Array<{ name: string; mimeType: string; dataBase64: string }>
    /** Estado de ecualizadores y clasificaciones de la pizarra, por id de bloque. Se valida contra la lección. */
    materialState?: Record<string, unknown>
    /** «Probar como estudiante»: el material sin validar se oculta, como para el alumno. */
    comoEstudiante?: boolean
  }

  // Cronómetro por fase; se registra al final (chat.stream.timing). Sirve para
  // ver dónde se va el tiempo de cada turno sin reproducirlo a mano.
  const t0 = performance.now()
  const marcas: Record<string, number> = {}
  const marcar = (fase: string) => { marcas[fase] = Math.round(performance.now() - t0) }

  // 1. Validate session and fetch full contentJson with course data.
  // Una sola ida y vuelta a Neon: la sesión trae sus últimos 20 mensajes y el
  // progreso de TODAS sus actividades (antes eran tres consultas en fila,
  // ~1 s antes de empezar a pensar). El contenido de la lección va aparte
  // porque tiene su propio caché de 60 s.
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.userId,
      endedAt: null,
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
      // Últimos 20 mensajes SIN filtrar por activityId (el filtro causaba que
      // el mensaje de transición se perdiera, dejando a Claude sin contexto del
      // escenario cuando el estudiante decía "no sé").
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
      activities: {
        orderBy: { completedAt: 'asc' },
      },
    },
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }
  // El instructor terminó el bloque o la ventana venció (22 oct 2026): Sophia
  // responde con un mensaje fijo y no se guarda nada.
  if (!lessonSession.isTest && !lessonSession.completedAt) {
    const cierre = await cierreParaAlumno(session.userId, lessonSession.lesson)
    if (cierre && ventanaPaso(cierre)) {
      const cuerpo = `data: ${JSON.stringify({ type: 'content', text: mensajeBloqueCerrado(cierre) })}

data: ${JSON.stringify({ type: 'done' })}

`
      return new Response(new TextEncoder().encode(cuerpo), {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      })
    }
  }
  // Material sin validar: solo en la prueba vista como instructor (lib/vista-estudiante.ts).
  const verSinValidar = lessonSession.isTest && comoEstudiante !== true

  const contentJsonRaw = await getLessonContent(lessonSession.lesson.id)
  marcar('db')

  const sessionWithMessages = lessonSession

  // 2. Lesson content (ya cargado en paralelo arriba)
  const contentJson = contentJsonRaw as LessonContent

  if (!contentJson) {
    logger.error('chat.stream.lesson_content_not_found', {
      sessionId,
      lessonId: lessonSession.lesson.id,
    })
    return new Response('Lesson content not found', { status: 404 })
  }

  // Obtener datos del curso para el prompt
  const courseInstructor = lessonSession.lesson.course?.instructor || 'Eres un instructor experto y amable.'
  const lessonTitle = lessonSession.lesson.title
  const lessonObjective = lessonSession.lesson.objective || ''
  const lessonKeyPoints = lessonSession.lesson.keyPoints || []

  // Obtener actividad actual basada en progreso
  let currentActivityContext

  if (lessonSession.activityId) {
    currentActivityContext = getCurrentActivity(
      contentJson,
      lessonSession.activityId,
      lessonTitle,
      lessonObjective,
      lessonKeyPoints,
      courseInstructor
    )
  } else {
    // Fallback: Primera vez, obtener primera actividad
    const firstActivity = getFirstActivity(contentJson)
    if (firstActivity) {
      currentActivityContext = getCurrentActivity(
        contentJson,
        firstActivity.activityId,
        lessonTitle,
        lessonObjective,
        lessonKeyPoints,
        courseInstructor
      )
    }
  }

  if (!currentActivityContext) {
    return new Response('No activities found in lesson', { status: 500 })
  }

  // A partir de aquí los mensajes quedan en orden CRONOLÓGICO (ascendente).
  // `reverse()` muta el arreglo: todo lo que sigue (prompt, búsquedas del último
  // mensaje de Sophia) lo recibe ya ascendente. Por eso «el último» se busca
  // desde el final con `ultimoDe`, nunca con `find`, que devolvería el más viejo.
  sessionWithMessages.messages.reverse()
  const ultimoDe = (role: 'user' | 'assistant') =>
    [...sessionWithMessages.messages].reverse().find((m) => m.role === role)

  const conversationHistory = sessionWithMessages.messages.map((m: Message) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Turno de conexión: el alumno contesta la pregunta de bienvenida (experiencia
  // previa), no la de la actividad 1. Esa respuesta no se verifica contra los
  // criterios de la actividad. Solo se puede saber si la ventana de 20 mensajes
  // incluye el inicio de la sesión.
  const ventanaIncluyeInicio = sessionWithMessages.messages.length < 20
  const bienvenida = ventanaIncluyeInicio && sessionWithMessages.messages[0]?.role === 'assistant'
    ? sessionWithMessages.messages[0]
    : null
  const isWelcomeReply = bienvenida !== null &&
    !sessionWithMessages.messages.some((m) => m.role === 'user')
  // La respuesta del alumno a la bienvenida (si ya ocurrió) tampoco es evidencia.
  const respuestaABienvenida = bienvenida && sessionWithMessages.messages[1]?.role === 'user'
    ? sessionWithMessages.messages[1]
    : null

  // Historial comprimido para enviar a Claude (optimizado)
  // - Mensajes del estudiante: completos
  // - Mensajes del instructor: resumidos con ESCENARIO + PREGUNTA preservados
  const compressedHistory = compressMessagesForAPI(conversationHistory, 10)

  // DEBUG: Log mensajes comprimidos para verificar preservación de escenario
  logger.info('chat.stream.compressed_history', {
    sessionId,
    originalCount: conversationHistory.length,
    compressedCount: compressedHistory.length,
    compressedMessages: compressedHistory.map(m => ({
      role: m.role,
      contentPreview: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '')
    }))
  })

  // 3. 🔥 NUEVO: Verificación ANTICIPADA antes de generar respuesta
  const currentActivity = currentActivityContext.activity

  // Historial para el VERIFICADOR: solo lo conversado en ESTA actividad. Antes
  // recibía los últimos mensajes de la sesión entera y acumulaba respuestas de
  // actividades anteriores: así una actividad que nunca se planteó (la rúbrica
  // de EVA-NOTA) se dio por cumplida con la respuesta al cálculo de la anterior.
  // La respuesta a la bienvenida solo se excluye si la bienvenida NO planteó la
  // pregunta de esta actividad (lecciones viejas, turno de conexión). Si la
  // planteó, esa respuesta ES la respuesta de la actividad (21 oct 2026: al
  // probar desde la actividad 4, el «listo» posterior no tenía respuesta previa
  // y el verificador nunca veía lo que el alumno había contestado).
  const bienvenidaPlanteaEsta = !!bienvenida && planteaLaPregunta(
    bienvenida.content,
    currentActivity.choice?.prompt ?? currentActivity.teaching?.first_question ?? currentActivity.verification.question,
  )
  const activityHistory = sessionWithMessages.messages
    .filter((m) => m.activityId === currentActivity.id && m !== bienvenida && (bienvenidaPlanteaEsta || m !== respuestaABienvenida))
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  // Sin mensajes archivados bajo la actividad (datos viejos): el último par basta.
  const verifierHistory = activityHistory.length > 0 ? activityHistory : conversationHistory.slice(-2)

  // Intentos, tangentes y evidencia de la actividad actual (vino con la sesión)
  const activityProgress = lessonSession.activities.find((a) => a.activityId === currentActivity.id) ?? null

  const attempts = activityProgress?.attempts || 0
  const tangentCount = activityProgress?.tangentCount || 0
  const existingEvidence = (activityProgress?.evidenceData as {
    attempts?: Array<unknown>
    scaffoldingTurns?: number
    wasExplained?: boolean
  } | null) || { attempts: [] }
  const scaffoldingTurns = existingEvidence.scaffoldingTurns || 0
  // Tope de intentos. Cada desglose gasta un turno del tope, con o sin nota: el
  // tope es lo que cuida el tiempo de la clase (lib/desglose.ts). `attempts`, el
  // contador de la nota, sigue sin sumar desgloses.
  const sinNota = currentActivity.verification.is_evaluative === false
  const topeDeIntentos = currentActivity.verification.max_attempts || 3
  const intentosPrevios = turnosPrevios(attempts, scaffoldingTurns)
  const wasExplained = existingEvidence.wasExplained === true
  // true si este turno se retiene el avance porque Sophia no pasó a la siguiente actividad
  let retenido = false

  // ── Paso cerrado (alternativas) ──────────────────────────────────────────
  // Si la actividad lo tiene y aún no se resolvió, este mensaje es la elección
  // del alumno: se corrige acá, sin modelo, y Sophia solo reacciona.
  const sessionSeed = lessonSession.id
  const choice = currentActivity.choice
  let choiceState: ChoiceState | undefined =
    (existingEvidence as { choice?: ChoiceState }).choice ??
    (choice ? newChoiceState(`${sessionSeed}:${currentActivity.id}`, choice) : undefined)
  let choiceTurn: ChoiceTurn | undefined
  // ¿La bienvenida planteó la actividad 1 (paso cerrado o pregunta abierta)?
  // Si no (lecciones viejas o bienvenida genérica), este turno es de conexión.
  const planteadoEnBienvenida = bienvenida
    ? planteaLaPregunta(bienvenida.content, choice?.prompt ?? currentActivity.teaching?.first_question ?? currentActivity.verification.question)
    : true
  const esTurnoDeConexion = isWelcomeReply && !planteadoEnBienvenida
  if (choice && choiceState && !choiceState.resolved && activityProgress?.status !== 'COMPLETED' && !esTurnoDeConexion) {
    const pick = parseChoicePick(message, choice, choiceState.order)
    if (pick === null) {
      choiceTurn = 'no_pick'
    } else {
      choiceState = applyPick(choiceState, choice, pick)
      choiceTurn = choiceState.correct ? 'pick_correct' : choiceState.revealed ? 'pick_wrong_revealed' : 'pick_wrong_retry'
    }
    logger.info('chat.stream.choice_turn', { sessionId, activityId: currentActivity.id, choiceTurn, picks: choiceState.picks })
  }
  // «La b, porque entregó los TC y rindió el examen»: eligió bien Y ya justificó.
  // No se le vuelve a preguntar: el mismo mensaje pasa al paso 2 y se verifica.
  // El texto de la opción tal cual (el alumno tocó el botón) no es una razón,
  // aunque sea largo: ver esEleccionConRazon (lib/choice.ts).
  const pickWithReason =
    choiceTurn === 'pick_correct' && esEleccionConRazon(message, choice?.options[choiceState?.picks.at(-1) ?? -1])
  if (pickWithReason) {
    logger.info('chat.stream.choice_pick_with_reason', { sessionId, activityId: currentActivity.id })
    choiceTurn = undefined
  }

  // ── Comprobación de cierre (spec del panel §16.1, decisión 15) ──────────
  // 2 a 4 preguntas cerradas antes de la reflexión. Las corrige y las responde
  // el código («Correcto» / «No: era B) …»), sin modelo y sin verificador.
  const checks = currentActivity.checks
  let checksState: ChecksState | undefined =
    (existingEvidence as { checks?: ChecksState }).checks ??
    (checks?.length ? newChecksState(sessionSeed, currentActivity.id, checks) : undefined)
  let checkTurn: CheckTurn | undefined
  if (checks?.length && checksState && !checksState.done && !choice && activityProgress?.status !== 'COMPLETED' && !esTurnoDeConexion) {
    const leido = readCheck(message, checks, checksState)
    checksState = leido.state
    checkTurn = leido.turn
    logger.info('chat.stream.check_turn', { sessionId, activityId: currentActivity.id, checkTurn })
  }
  let respuestaFija: string | null = checkTurn && checks && checksState
    ? checkReply(checks, checksState, checkTurn, currentActivity.verification.question)
    : null

  // Cap de sub-preguntas (desglose) por tipo de actividad. Reflection cierra
  // pronto porque es una sola pregunta abierta — no se desglosa repetidamente.
  // CODE methodology no escala (usa verifyStepCompletion binario).
  const SCAFFOLDING_CAP_BY_TYPE: Record<string, number> = {
    explanation: 3,
    practice: 3,
    reflection: 1,
    closing: 3,
  }
  const scaffoldingCap = SCAFFOLDING_CAP_BY_TYPE[currentActivity.type as string] ?? 3

  // ═══════════════════════════════════════════════════════════════
  // 3. MODERACIÓN + CLASIFICACIÓN + VERIFICACIÓN EN PARALELO
  // ═══════════════════════════════════════════════════════════════
  // Backwards compatibility: support both old and new structure
  const currentActivityInstruction = currentActivity.teaching?.agent_instruction ||
    (currentActivity as { agent_instruction?: string }).agent_instruction || ''

  // 🔥 FIX: Buscar el último mensaje del INSTRUCTOR (no cualquier mensaje)
  const lastInstructorMessage = ultimoDe('assistant')

  // Detectar si la actividad ya fue completada previamente
  const activityAlreadyCompleted = activityProgress?.status === 'COMPLETED'

  // Detectar si el mensaje es una confirmación simple ("sí", "ok", "continuar")
  const CONTINUATION_REGEX = /^(si|sí|ok|vale|entendido|claro|continuar|siguiente|adelante|de acuerdo|perfecto|listo|vamos|dale|ya|bueno)(\s+(por\s+favor|porfavor|gracias))?[.!]?$/i
  const isContinuationMessage = CONTINUATION_REGEX.test(message.trim())

  // Detector de hallucinations de voz (Whisper transcribiendo ruido como palabras).
  // Si se detecta, saltamos verificación AI (caro y engañoso) y devolvemos
  // un off_topic suave que no cuenta como intento real.
  // Con la pregunta: repetir sus palabras al responder no es ruido (21 oct 2026).
  const hallucinationCheck = detectHallucination(
    message,
    [currentActivity.verification.question, currentActivity.teaching?.first_question ?? ''].join(' '),
  )
  if (hallucinationCheck.isHallucination) {
    logger.warn('chat.stream.hallucination_detected', {
      sessionId,
      userId: session.userId,
      reason: hallucinationCheck.reason,
      messagePreview: message.slice(0, 80),
    })
  }

  // ⚡ OPTIM #2: en continuaciones ("sí/ok/listo") la moderación y la
  // clasificación de intención son innecesarias (mensaje obviamente seguro y
  // on-topic) → evitamos 2 llamadas IA y dejamos que el Promise.all lo gobierne
  // solo la verificación.
  const SAFE_MODERATION: ModerationResult = {
    is_safe: true, violations: [], severity: 'none', requires_intervention: false,
  }
  const CONTINUATION_INTENT: IntentClassification = {
    intent: 'answer_verification', question_type: null, is_on_topic: true,
    relevance_score: 100, topic_mentioned: null, needs_redirect: false,
    suggested_response_strategy: 'acknowledge_answer',
  }

  const SIN_VERIFICAR: ActivityCompletionResult = {
    completed: false,
    criteriaMatched: [],
    criteriaMissing: [],
    completeness_percentage: 0,
    understanding_level: 'beginning',
    response_type: 'continuation',
    feedback: '',
    confidence: 'high',
    ready_to_advance: false,
    needs_scaffolding: false,
    next_subquestion: undefined,
  }

  // Rutina y cierre sin nota, de un solo turno: se aceptan sin verificador.
  // Prueba del 19 oct 2026: «todo está claro» en el cierre salió «incorrecto»,
  // Sophia volvió a preguntar y el código terminó la lección con la pregunta
  // colgada. Con un turno y sin nota, el código avanzaba igual; el verificador
  // solo agregaba ~5 s y la posibilidad de contradecirse.
  const sinNotaDeUnTurno =
    currentActivity.verification.is_evaluative === false &&
    (currentActivity.verification.max_attempts ?? 3) <= 1
  const ACEPTADA_SIN_NOTA: ActivityCompletionResult = {
    completed: true,
    criteriaMatched: [],
    criteriaMissing: [],
    completeness_percentage: 100,
    understanding_level: 'achieved',
    response_type: 'correct',
    feedback: '',
    confidence: 'high',
    ready_to_advance: true,
    needs_scaffolding: false,
    next_subquestion: undefined,
  }

  // Clasificaciones de la pizarra (lib/clasificar.ts): dónde dejó cada tarjeta es
  // parte de su respuesta, así que el verificador lo recibe junto con el mensaje.
  const estadosDeClasificacion: { b: ClassifyBlock; state: ClasifState }[] = [
    ...blocksForActivity(contentJson, currentActivity.id, verSinValidar).pinned,
    ...getActivityBlocks(currentActivity),
  ]
    .filter((b): b is ClassifyBlock => b.type === 'classify')
    .map((b) => ({ b, state: sanitizeClasif(b, materialState?.[b.id]) ?? clasificacionVacia() }))
  // Textos subrayables (lib/subrayado.ts): lo subrayado es la evidencia que eligió del material.
  // Solo los de esta actividad y los fijados que ella declara en `uses`: un
  // subrayado de la actividad 4 no debe viajar a la 6.
  const estadosDeSubrayado: { b: TextBlock; state: SubrayadoState }[] = [
    ...blocksForActivity(contentJson, currentActivity.id, verSinValidar).pinned.filter((b) => currentActivity.teaching?.uses?.includes(b.id)),
    ...getActivityBlocks(currentActivity),
  ]
    .filter((b): b is TextBlock => b.type === 'text' && b.subrayable === true)
    .map((b) => ({ b, state: sanitizeSubrayado(b, materialState?.[b.id]) ?? sinSubrayar() }))
  const clasifParaVerificador = [
    ...estadosDeClasificacion.map(({ b, state }) => describeClasifForVerifier(b, state)),
    ...estadosDeSubrayado.map(({ b, state }) => describeSubrayadoForVerifier(b, state)),
  ]
    .filter(Boolean)
    .join('\n')
  const mensajeParaVerificar = clasifParaVerificador ? `${message}\n\n${clasifParaVerificador}` : message

  // Textos para subrayar propios de esta actividad y la primera línea que no respalda.
  const idsPropios = new Set(getActivityBlocks(currentActivity).map((b) => b.id))
  const subrayablesPropios = estadosDeSubrayado.filter(({ b }) => idsPropios.has(b.id))
  const fallosDeSubrayado = (existingEvidence as { subrayadoFallos?: number }).subrayadoFallos ?? 0
  // Solo cuenta lo subrayado que CAMBIÓ desde la última vez en esta actividad: la
  // línea sigue marcada en el navegador y viaja en cada mensaje. Antes se volvía
  // a revisar y guardar en cada turno, y bajo cada respuesta aparecía otra vez
  // «Subrayaste… ✓ respalda tu respuesta» (21 oct 2026).
  const ultimoSubrayadoGuardado = new Map<string, UltimoSubrayado>()
  for (const m of sessionWithMessages.messages) {
    if (m.role !== 'user' || m.activityId !== currentActivity.id) continue
    // Los mensajes están en orden cronológico: el último que se vea queda.
    for (const s of leerSubrayadoGuardado((m as { material?: unknown }).material)) {
      ultimoSubrayadoGuardado.set(s.blockId, { lineas: s.lineas.join('|'), resultado: s.resultado, revelada: !!s.revelada?.length })
    }
  }
  const lineasDe = (b: TextBlock, state: SubrayadoState) => paraGuardar(b, state)?.lineas.join('|') ?? ''
  // …y también si vuelve a tocar la misma línea equivocada (lib/subrayado.ts):
  // antes no se respondía nada y quedaba en gris «en revisión» (Maritza, 21 oct).
  const esSubrayadoNuevo = ({ b, state }: { b: TextBlock; state: SubrayadoState }) =>
    hayQueRevisarSubrayado(lineasDe(b, state), ultimoSubrayadoGuardado.get(b.id), isContinuationMessage)
  const subrayadoQueNoRespalda = subrayablesPropios.find((e) => esSubrayadoNuevo(e) && evaluarSubrayado(e.b, e.state) === 'no_respalda')
  // Tocó otra vez la misma línea equivocada: se repite «inténtalo de nuevo» (rojo
  // y mensaje fijo), sin verificador, sin contar intento ni falla.
  const repiteLineaEquivocada =
    !!subrayadoQueNoRespalda &&
    esRepeticionEquivocada(lineasDe(subrayadoQueNoRespalda.b, subrayadoQueNoRespalda.state), ultimoSubrayadoGuardado.get(subrayadoQueNoRespalda.b.id), isContinuationMessage) &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    lessonSession.lesson.course?.methodology !== 'CODE'
  // Revisión al tocar (21 oct 2026): el navegador manda «listo» apenas el alumno
  // toca una línea, si ya respondió. Si la línea no respalda y es el primer
  // error, no hace falta verificador ni modelo: la línea se pone roja y Sophia
  // dice «inténtalo de nuevo» en menos de un segundo.
  const revisionRapida =
    !!subrayadoQueNoRespalda &&
    !repiteLineaEquivocada &&
    fallosDeSubrayado < 1 &&
    isContinuationMessage &&
    activityHistory.some((m) => m.role === 'user') &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    lessonSession.lesson.course?.methodology !== 'CODE'

  // Pedir que le aclaren la pregunta no es responderla (lib/aclaracion.ts, prueba
  // de Edwin del 21 oct 2026): no se verifica, no cuenta intento ni avanza.
  const pidioAclaracion =
    pideAclaracion(message) &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    lessonSession.lesson.course?.methodology !== 'CODE'

  // Pedir seguir no es responder (lib/pide-seguir.ts; Maritza 24 oct, Rosario 26
  // oct 2026): «¿podemos continuar?» gastaba intentos y desgloses y cerraba la
  // actividad por tope. No se verifica ni cuenta; el código repite lo pedido.
  const pidioSeguir =
    pideSeguir(message) &&
    !isContinuationMessage &&
    !pidioAclaracion &&
    !revisionRapida &&
    !repiteLineaEquivocada &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    lessonSession.lesson.course?.methodology !== 'CODE'

  // La respuesta escrita ya aprobó y solo faltaba tocar la línea (27 oct 2026): al
  // tocarla llega un «listo» y el verificador volvía a evaluar lo mismo (461
  // llamadas en un día). Se usa lo que aprobó cuando se pidió la línea.
  const aprobadaSinLinea = (existingEvidence as { aprobadaSinLinea?: ActivityCompletionResult }).aprobadaSinLinea
  const reusarAprobacion =
    !!aprobadaSinLinea &&
    isContinuationMessage &&
    !revisionRapida &&
    !repiteLineaEquivocada &&
    subrayablesPropios.some(esSubrayadoNuevo) &&
    !choiceTurn &&
    !checkTurn &&
    !activityAlreadyCompleted

  // ¿Este turno pasa por el verificador? (las mismas condiciones del Promise.all de abajo)
  const verificadorCorre = !(
    pidioAclaracion || pidioSeguir || revisionRapida || repiteLineaEquivocada || reusarAprobacion ||
    hallucinationCheck.isHallucination || checkTurn || choiceTurn || esTurnoDeConexion ||
    activityAlreadyCompleted || sinNotaDeUnTurno
  )

  const [moderation, intentClasificada, verification] = await Promise.all([
    isContinuationMessage || choiceTurn || checkTurn || pidioSeguir
      ? Promise.resolve(SAFE_MODERATION)
      : moderateContent(message, { lessonTitle }),
    // Si corre el verificador, la intención sale de él (más abajo): ya dice si el
    // mensaje está fuera de tema, que es lo único que se usa de la clasificación.
    // Clasificarla aparte era otra llamada por mensaje (12 % del gasto, 27 oct 2026).
    isContinuationMessage || choiceTurn || checkTurn || pidioSeguir || verificadorCorre
      ? Promise.resolve(CONTINUATION_INTENT)
      : classifyIntent(message, currentActivity, {
          currentLesson: lessonTitle,
          currentActivity: currentActivityInstruction,
          lastInstructorQuestion: lastInstructorMessage?.content || undefined
        }),
    pidioAclaracion || pidioSeguir
      ? Promise.resolve<ActivityCompletionResult>(SIN_VERIFICAR)
    // Revisión al tocar, o la misma línea equivocada otra vez: el código ya sabe que no respalda.
    : revisionRapida || repiteLineaEquivocada
      ? Promise.resolve<ActivityCompletionResult>({ ...SIN_VERIFICAR, response_type: 'partial' })
    : reusarAprobacion
      ? Promise.resolve<ActivityCompletionResult>({ ...aprobadaSinLinea!, completed: true, ready_to_advance: true })
    // Hallucination de voz: skip AI verifier (caro), tratar como off_topic
    // suave para que Sophia pida repetir sin contar como intento real.
    : hallucinationCheck.isHallucination
      ? Promise.resolve<ActivityCompletionResult>({
          completed: false,
          criteriaMatched: [] as string[],
          criteriaMissing: [] as string[],
          completeness_percentage: 0,
          understanding_level: 'beginning' as const,
          response_type: 'off_topic' as const,
          feedback: 'No te entendí bien, ¿puedes repetir?',
          confidence: 'high' as const,
          ready_to_advance: false,
          needs_scaffolding: false,
          next_subquestion: undefined,
        })
    // Comprobación de cierre: corregida en código; no hay verificación de IA.
    : checkTurn
      ? Promise.resolve<ActivityCompletionResult>(SIN_VERIFICAR)
    // Paso cerrado: ya se corrigió en código; no hay verificación de IA.
    : choiceTurn
      ? Promise.resolve<ActivityCompletionResult>({
          ...SIN_VERIFICAR,
          response_type: choiceTurn === 'pick_correct' ? 'correct' : choiceTurn === 'no_pick' ? 'continuation' : 'incorrect',
        })
    // Respuesta a una bienvenida genérica (lecciones viejas): es conexión, no
    // la actividad 1. No se verifica ni cuenta intento; Sophia la plantea ahora.
    : esTurnoDeConexion
      ? Promise.resolve<ActivityCompletionResult>(SIN_VERIFICAR)
    // Solo skip verificación si la actividad YA está completada en DB.
    // criteriaMatched queda [] — antes era ["Actividad ya completada"] (string
    // genérico) que contaminaba evidenceData y rompía el reporte (no podía
    // distinguir qué must_include real cumplió).
    : activityAlreadyCompleted
      ? Promise.resolve<ActivityCompletionResult>({
          completed: true,
          criteriaMatched: [] as string[],
          criteriaMissing: [] as string[],
          completeness_percentage: 100,
          understanding_level: 'developing' as const,
          response_type: 'correct' as const,
          feedback: '',
          confidence: 'high' as const,
          ready_to_advance: true,
          needs_scaffolding: false,
          next_subquestion: undefined,
        })
      : sinNotaDeUnTurno
        ? Promise.resolve<ActivityCompletionResult>(ACEPTADA_SIN_NOTA)
      // Continuaciones ("sí", "listo"): verificar acumulativamente.
      // CODE: verificación binaria (¿completó el paso?). REFLECTIVE: socrática.
      : (lessonSession.lesson.course?.methodology === 'CODE'
          ? verifyStepCompletion(message, currentActivity, verifierHistory)
          : verifyActivityCompletion(mensajeParaVerificar, currentActivity, verifierHistory, wasExplained, allLessonBlocks(contentJson, verSinValidar)))
  ])
  marcar('gate')
  const intent: IntentClassification =
    verificadorCorre && !isContinuationMessage && verification.response_type === 'off_topic'
      ? { ...CONTINUATION_INTENT, intent: 'off_topic', is_on_topic: false, relevance_score: 0, needs_redirect: true, suggested_response_strategy: 'brief_redirect' }
      : intentClasificada

  // Un paso sin nota de un turno (rutina, cierre) se acepta sin verificador, pero
  // un mensaje fuera de tema no lo responde (23 oct 2026, clase de EOM): «¿Eres
  // mejor que Gemini?» cerraba el paso Veo, Sophia repetía su pregunta y el código
  // le pegaba la del paso siguiente, dos preguntas en un mensaje (6 de 11 alumnos).
  // No cuenta intento ni avanza; Sophia repite la pregunta del paso.
  const desvioEnPasoSinNota =
    sinNotaDeUnTurno &&
    !isContinuationMessage &&
    !pidioAclaracion &&
    !pidioSeguir &&
    !activityAlreadyCompleted &&
    !hallucinationCheck.isHallucination &&
    (!intent.is_on_topic || intent.intent === 'off_topic' || intent.intent === 'small_talk')
  if (desvioEnPasoSinNota) {
    Object.assign(verification, { ...SIN_VERIFICAR, response_type: 'off_topic' })
    logger.info('chat.stream.desvio_en_paso_sin_nota', { sessionId, activityId: currentActivity.id, intent: intent.intent })
  }

  // Detectar si esta vuelta vamos a inyectar una MINI-EXPLICACIÓN (el alumno
  // admite que no conoce el tema + primer intento + no fue explicado antes).
  // Si sí, marcamos el flag para que el verificador en la próxima vuelta sepa
  // "ya hubo enseñanza". Quién decide que «no sabe» es el verificador, con el
  // contexto completo — no un regex sobre el texto.
  // En una conversación sobre el panel el primer «no sé» pide la acción, no
  // explica (prompt-builder, «PIDE UNA ACCIÓN»): no hay explicación que marcar.
  const esConversacionDePanel =
    !currentActivity.choice &&
    !currentActivity.checks &&
    (getActivityBlocks(currentActivity).length > 0 ||
      blocksForActivity(contentJson, currentActivity.id, verSinValidar).pinned.some((b) => b.type === 'simulator'))
  const willExplainThisTurn =
    !wasExplained &&
    attempts <= 1 &&
    verification.student_intent === 'does_not_know' &&
    !esConversacionDePanel

  // Logging de clasificación
  logger.info('chat.stream.classification', {
    sessionId,
    intent: intent.intent,
    is_on_topic: intent.is_on_topic,
    relevance_score: intent.relevance_score,
    moderation_safe: moderation.is_safe,
  })

  // Lo que decidió el verificador ANTES de que el código fuerce el avance (tope de
  // desglose, cierre por intentos): decide si Sophia puede calificar (26 oct 2026).
  const aproboElVerificador = verification.ready_to_advance === true && verification.unverified !== true

  // ═══════════════════════════════════════════════════════════════
  // Escalada por desglose (scaffolding)
  // ═══════════════════════════════════════════════════════════════
  // El AI evaluador puede indicar needs_scaffolding=true cuando la respuesta
  // es parcial/cero pero en tema. Sophia entonces desglosa con una sub-pregunta
  // específica. Si ya alcanzamos el cap por tipo, forzamos avanzar con el nivel
  // actual (no se castiga al estudiante: el nivel ya refleja lo que llegó a dar).
  // Clase de Rosario (26 oct 2026, S0 de tutoría): en un paso sin nota de 2
  // intentos, el desglose no contaba y respondió 4 veces; y al llegar al tope de
  // desglose, una respuesta a OTRA pregunta (off_topic) cerró la actividad 3.
  // Ahora una respuesta fuera de tema no se desglosa (Sophia la redirige), y sin
  // nota cada turno de desglose cuenta para el tope de intentos. Clase de SI A
  // (26 oct 2026): con nota tampoco alcanzaba; Gianny respondió tres veces en
  // una actividad de 2 intentos. Ahora el desglose gasta el tope siempre y, con
  // nota, el turno que lo agota no se desglosa: cierra por límite (cierraPorTope).
  let willScaffold = false
  if (
    verification.needs_scaffolding === true &&
    verification.next_subquestion &&
    verification.response_type !== 'off_topic' &&
    !activityAlreadyCompleted
  ) {
    const decision = decidirDesglose({
      intentos: attempts,
      desgloses: scaffoldingTurns,
      topeDeDesgloses: scaffoldingCap,
      topeDeIntentos,
      sinNota,
    })
    if (decision === 'desglosa') {
      willScaffold = true
    } else if (decision === 'tope-de-intentos') {
      verification.needs_scaffolding = false
    } else {
      // Cap alcanzado: avanzar con el nivel ya escalado
      verification.needs_scaffolding = false
      verification.ready_to_advance = true
      logger.info('chat.stream.scaffolding_cap_reached', {
        sessionId,
        activityId: currentActivity.id,
        scaffoldingTurns,
        cap: scaffoldingCap,
        finalLevel: verification.understanding_level,
      })
    }
  }

  // En una continuación («listo») el intento guarda lo dicho en toda la actividad:
  // si no, el reporte mostraría «listo» como la respuesta del alumno.
  const respuestaParaGuardar = isContinuationMessage
    ? [...activityHistory.filter((m) => m.role === 'user').map((m) => m.content), message].join(' · ')
    : message

  // ── Turno de subrayar (investigacion/turno-de-subrayar-2026-10-20.md) ──────
  // La actividad tiene un texto propio para subrayar, el alumno respondió sin
  // subrayar nada y todavía no se le pidió: este turno no se evalúa ni cuenta
  // intento; Sophia solo pide la línea. Una sola vez por actividad. No se
  // intercepta un «no sé», una ayuda, un fuera de tema ni una continuación.
  // Desde el 23 oct 2026, solo si la respuesta escrita aprobó y si no tocó ya una
  // línea en esta actividad (lo guardado cuenta aunque el navegador lo olvide).
  const sinSubrayarAun =
    faltaTocarLaLinea({
      textos: subrayablesPropios.map(({ state }) => state),
      tocoAntes: subrayablesPropios.some(({ b }) => ultimoSubrayadoGuardado.has(b.id)),
      aprobo: verification.ready_to_advance === true && verification.unverified !== true,
    }) &&
    !pidioAclaracion &&
    lessonSession.lesson.course?.methodology !== 'CODE' &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    !hallucinationCheck.isHallucination &&
    verification.unverified !== true &&
    verification.response_type !== 'off_topic' &&
    verification.response_type !== 'continuation' &&
    verification.student_intent !== 'does_not_know' &&
    verification.student_intent !== 'asks_for_help'
  const evidenciaSubrayado = existingEvidence as { subrayadoPedido?: boolean; subrayadoRecordado?: boolean }
  const turnoDeSubrayar = sinSubrayarAun && evidenciaSubrayado.subrayadoPedido !== true
  // Prueba de Edwin (21 oct 2026): tras el pedido volvió a dictar la respuesta sin
  // tocar la línea, y la actividad se evaluó y avanzó sin lectura comprobada. Ahora
  // se le recuerda una vez, sin evaluar lo que escribió; a la segunda, se sigue.
  const recordarSubrayado = sinSubrayarAun && evidenciaSubrayado.subrayadoPedido === true && evidenciaSubrayado.subrayadoRecordado !== true
  // Lo que aprobó el verificador al pedir la línea, antes de retener el avance (ver reusarAprobacion).
  const aprobacionAlPedirLinea: ActivityCompletionResult | null = turnoDeSubrayar ? { ...verification } : null
  if (recordarSubrayado) {
    verification.ready_to_advance = false
    verification.completed = false
    willScaffold = false
    respuestaFija = mensajeRecordatorioSubrayado(subrayablesPropios.map(({ b }) => b.title))
    logger.info('chat.stream.subrayado_recordado', { sessionId, activityId: currentActivity.id })
  }
  if (turnoDeSubrayar) {
    verification.ready_to_advance = false
    verification.completed = false
    willScaffold = false
    // Mensaje fijo, sin modelo: no califica, no insinúa la línea ni cambia de tema.
    respuestaFija = mensajeTurnoDeSubrayar(subrayablesPropios.map(({ b }) => b.title))
    logger.info('chat.stream.subrayado_pedido', { sessionId, activityId: currentActivity.id })
  }

  // ── Revisar el subrayado (21 oct 2026) ─────────────────────────────────
  // La lección declara la línea que respalda (`lineasClave`). Si la respuesta
  // escrita aprobó pero lo subrayado no la respalda: la primera vez la actividad
  // no avanza ni cuenta intento y Sophia pide cambiarlo; la segunda, se sigue y
  // Sophia muestra la línea que respaldaba. Antes decía «Correcto» igual.
  if (repiteLineaEquivocada) {
    verification.ready_to_advance = false
    verification.completed = false
    willScaffold = false
    respuestaFija = mensajeRevisarSubrayado(subrayadoQueNoRespalda!.b)
    logger.info('chat.stream.subrayado_repetido', { sessionId, activityId: currentActivity.id })
  }
  const revisarSubrayado =
    !turnoDeSubrayar &&
    !repiteLineaEquivocada &&
    !!subrayadoQueNoRespalda &&
    fallosDeSubrayado < 1 &&
    (revisionRapida || (verification.ready_to_advance === true && verification.unverified !== true)) &&
    !choiceTurn &&
    !checkTurn &&
    !esTurnoDeConexion &&
    !activityAlreadyCompleted &&
    lessonSession.lesson.course?.methodology !== 'CODE'
  if (revisarSubrayado) {
    verification.ready_to_advance = false
    verification.completed = false
    willScaffold = false
    // Mensaje fijo, sin modelo: no puede insinuar la línea correcta.
    respuestaFija = mensajeRevisarSubrayado(subrayadoQueNoRespalda!.b)
    logger.info('chat.stream.subrayado_revisar', { sessionId, activityId: currentActivity.id })
  }
  // Segunda línea equivocada: se revela la que respalda, SOLO si la respuesta
  // escrita aprobó (21 oct 2026, prueba de Walther). Con una respuesta parcial,
  // la línea revelada era justo la razón que faltaba: Sophia decía «tu respuesta
  // va bien», daba la razón y después la preguntaba. Si no aprobó, Sophia
  // trabaja la respuesta como siempre y el pedido de tocar sigue pendiente.
  const revelarSubrayado =
    !!subrayadoQueNoRespalda &&
    !repiteLineaEquivocada &&
    !revisarSubrayado &&
    !turnoDeSubrayar &&
    fallosDeSubrayado >= 1 &&
    verification.ready_to_advance === true &&
    verification.unverified !== true
  // Una línea equivocada en un «listo», sin respuesta nueva: se evalúa lo escrito,
  // pero el toque no cuenta como intento ni cierra la actividad por tope.
  const lineaEquivocadaSola = isContinuationMessage && !!subrayadoQueNoRespalda && !revisarSubrayado && !turnoDeSubrayar && !revelarSubrayado
  // Pidió seguir: se repite lo que Sophia pidió, con un mensaje fijo y sin modelo.
  if (pidioSeguir && respuestaFija === null) {
    willScaffold = false
    respuestaFija = mensajePideSeguir(lastInstructorMessage?.content ?? '', currentActivity.verification.question)
    logger.info('chat.stream.pide_seguir', { sessionId, activityId: currentActivity.id })
  }
  // Turnos que no evalúan ni cuentan intento.
  const turnoSinEvaluar = turnoDeSubrayar || recordarSubrayado || revisarSubrayado || repiteLineaEquivocada || pidioAclaracion || desvioEnPasoSinNota || pidioSeguir

  // ¿Este turno agota los intentos? Misma condición que el avance forzado de
  // más abajo (bloque «intento fallido»: ni paso cerrado, ni comprobación, ni
  // continuación, ni ruido de voz; attempts + 1 >= tope). Se calcula ANTES del
  // prompt para que Sophia cierre o haga la transición en vez de seguir
  // preguntando sobre una actividad que el código ya cerró (19 oct 2026).
  const cierraPorTope =
    !choiceTurn &&
    !checkTurn &&
    !activityAlreadyCompleted &&
    !verification.ready_to_advance &&
    verification.unverified !== true &&
    verification.response_type !== 'continuation' &&
    !hallucinationCheck.isHallucination &&
    intentosPrevios + 1 >= topeDeIntentos &&
    // Fuera de tema no es un intento (no suma) ni cierra la actividad (26 oct 2026).
    verification.response_type !== 'off_topic' &&
    !turnoSinEvaluar &&
    !lineaEquivocadaSola

  // ═══════════════════════════════════════════════════════════════
  // 4. VERIFICAR MODERACIÓN - Intervenir sin guardar en BD
  // ═══════════════════════════════════════════════════════════════
  if (!moderation.is_safe) {
    logger.warn('chat.stream.moderation_blocked', {
      sessionId,
      userId: session.userId,
      severity: moderation.severity,
      violations: moderation.violations,
    })

    const interventionMessage = getInterventionMessage(moderation, courseInstructor)

    // Retornar mensaje de intervención sin streaming completo
    const encoder = new TextEncoder()
    const interventionStream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({ type: 'content', text: interventionMessage })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      }
    })

    return new Response(interventionStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  logger.info('chat.stream.pre_verification', {
    sessionId,
    activityId: currentActivity.id,
    completed: verification.completed,
    ready_to_advance: verification.ready_to_advance,
    completeness_percentage: verification.completeness_percentage,
    confidence: verification.confidence,
    attempts: attempts + 1,
  })

  // Obtener lista de actividades completadas para contexto del prompt
  const completedActivityIds = lessonSession.activities
    .filter(a => a.status === 'COMPLETED')
    .map(a => a.activityId)

  // ═══════════════════════════════════════════════════════════════
  // 5. BUILD SYSTEM PROMPT CON PROMPT CACHING
  // ═══════════════════════════════════════════════════════════════
  // Obtener contexto de lección (normativo/técnico) si existe
  const lessonContext = getLessonContext(contentJson)

  // 🔥 NUEVO: Obtener siguiente actividad cuando ready_to_advance para transición fluida
  let nextActivityData = undefined
  if ((verification.ready_to_advance || cierraPorTope) && !currentActivityContext.isLastActivity) {
    const nextActivityRef = getNextActivity(contentJson, currentActivity.id)
    if (nextActivityRef) {
      nextActivityData = getActivityById(contentJson, nextActivityRef.activityId)
    }
  }

  // 🔍 DEBUG: Log información crítica para diagnosticar regresión a actividades anteriores
  logger.info('chat.stream.prompt_context', {
    sessionId,
    currentActivityId: currentActivity.id,
    currentActivityQuestion: currentActivity.verification.question.slice(0, 100),
    verificationReady: verification.ready_to_advance,
    verificationResponseType: verification.response_type,
    attempts: attempts + 1,
    studentMessage: message.slice(0, 50),
    messagesCount: sessionWithMessages.messages.length,
    completedActivitiesCount: completedActivityIds.length,
  })

  // ── Material de apoyo: qué ya mostró Sophia y qué marcadores valen ──────
  // Lo citado sale de los marcadores [[block:ID]] / [[marker:ID:n]] guardados en
  // sus mensajes (el navegador hace la misma cuenta para mostrar el panel).
  const materialCitado = citedFromTexts(
    sessionWithMessages.messages.filter((m) => m.role === 'assistant').map((m) => m.content),
  )
  const idsDeLaLeccion = new Set(allLessonBlocks(contentJson, verSinValidar).map((b) => b.id))
  const bloquesActuales = getActivityBlocks(currentActivity)
  // Un bloque se puede mostrar si existe en la lección. Un señalamiento, solo si
  // es de una imagen de ESTA actividad: así una escena de la actividad siguiente
  // nunca se señala al presentarla (spec §13: «Sophia revela antes de tiempo»).
  const marcadorValido: MarkerCheck = (kind, id, n) => {
    if (kind === 'block') return idsDeLaLeccion.has(id)
    const b = bloquesActuales.find((x) => x.id === id)
    return b?.type === 'image' && !!b.markers?.some((m) => m.n === n)
  }

  // ── Ecualizadores del panel: lo que el alumno movió (spec del panel §16.3) ──
  // El navegador manda el estado; se valida contra la lección. Si no movió
  // nada, se describe el caso con que abre. Las notas propias («Mis notas»)
  // llegan a Sophia en este turno pero no se guardan (decisión 14).
  const simuladoresVisibles = [
    ...blocksForActivity(contentJson, currentActivity.id, verSinValidar).pinned,
    ...bloquesActuales,
  ].filter((b): b is Extract<typeof b, { type: 'simulator' }> => b.type === 'simulator')
  const estadosDelPanel: { id: string; state: SimState; texto: string; directiva: string | null }[] = simuladoresVisibles.map((b) => {
    const state = sanitizeState(b, materialState?.[b.id]) ?? initialState(b)
    return { id: b.id, state, texto: describeStateForPrompt(b, state), directiva: directivaSiYaMovio(b, state) }
  })
  // Si ya movió, la directiva va primero: el guion de la actividad («baja el
  // TC2 y dime qué ves») le ganaba al estado y Sophia pedía lo ya hecho (14 oct 2026).
  const directivas = estadosDelPanel.map((e) => e.directiva).filter((d): d is string => !!d)
  const estadoPanelClause = estadosDelPanel.length
    ? `\n\n${directivas.map((d) => `⚠️ ${d}\n`).join('')}ESTADO DEL ECUALIZADOR (lo que el estudiante ve AHORA; reacciona a esto, no a lo que él crea que vio):\n${estadosDelPanel.map((e) => `- ${e.texto}`).join('\n')}`
    : ''
  const panelGuardable = Object.fromEntries(estadosDelPanel.filter((e) => !e.state.own).map((e) => [e.id, e.state]))
  // Va dentro de la evidencia que escriba este turno (antes se leía y
  // reescribía la fila al final: dos idas y vueltas más por mensaje).
  const clasifGuardable = Object.fromEntries(
    estadosDeClasificacion.filter(({ state }) => Object.keys(state.placements).length).map(({ b, state }) => [b.id, state]),
  )
  // Lectura comprobada (21 oct 2026): ¿la actividad tiene un texto con línea que
  // respalda y el alumno nunca la tocó bien? Se reescribe en cada turno, así que al
  // cerrar la actividad queda el valor final; el Monitor lo muestra al instructor.
  const conLineaClave = subrayablesPropios.filter(({ b }) => (b.lineasClave?.length ?? 0) > 0)
  const lecturaComprobada =
    conLineaClave.some(({ b, state }) => evaluarSubrayado(b, state) === 'respalda') ||
    sessionWithMessages.messages.some(
      (m) => m.role === 'user' && m.activityId === currentActivity.id &&
        leerSubrayadoGuardado((m as { material?: unknown }).material).some((s) => s.resultado === 'respalda'),
    )
  const panelExtra = {
    ...(conLineaClave.length ? { lecturaNoComprobada: !lecturaComprobada } : {}),
    ...(evidenciaSubrayado.subrayadoRecordado || recordarSubrayado ? { subrayadoRecordado: true } : {}),
    ...(Object.keys(panelGuardable).length ? { panelState: panelGuardable } : {}),
    ...(Object.keys(clasifGuardable).length ? { clasificaciones: clasifGuardable } : {}),
    ...(estadosDeSubrayado.some(({ state }) => state.lineas.length)
      ? { subrayados: Object.fromEntries(estadosDeSubrayado.filter(({ state }) => state.lineas.length).map(({ b, state }) => [b.id, state])) }
      : {}),
  }
  // Revisar manda sobre todo lo demás del turno; revelar se suma a la guía normal.
  // La línea correcta recién tocada: la primera oración la fija el código
  // (lib/subrayado.ts), porque con «inténtalo de nuevo» en la historia Sophia
  // la trataba como otra equivocada (21 oct 2026).
  const subrayadoCorrectoNuevo = subrayablesPropios.some((e) => esSubrayadoNuevo(e) && evaluarSubrayado(e.b, e.state) === 'respalda')
  const guiaDeSubrayado = revelarSubrayado && subrayadoQueNoRespalda
    ? `\n\n${guiaRevelarSubrayado(subrayadoQueNoRespalda.b)}`
    : subrayadoCorrectoNuevo && respuestaFija === null
      ? `\n\n${guiaLineaCorrecta(verification.ready_to_advance === true || cierraPorTope)}`
      : ''
  const estadoSubrayadoClause = estadosDeSubrayado.length
    ? `\n\nESTADO DEL SUBRAYADO (lo que el estudiante marcó AHORA en los textos de la pizarra):\n${estadosDeSubrayado.map(({ b, state }) => `- ${describeSubrayadoForPrompt(b, state)}`).join('\n')}`
    : ''
  const estadoClasifClause = estadosDeClasificacion.length
    ? `\n\nESTADO DE LA CLASIFICACIÓN (lo que el estudiante ubicó AHORA en la pizarra):\n${estadosDeClasificacion.map(({ b, state }) => `- ${describeClasifForPrompt(b, state)}`).join('\n')}`
    : ''
  let evidenciaEscrita = false

  // Punto clave, caso corto y cierre de una sesión de curso: la pregunta de la
  // actividad que queda abierta la pone el código al final del mensaje, y las que
  // escriba Sophia se quitan (lib/perfil-curso.ts, 27 oct 2026).
  const preguntaFinal = lessonSession.lesson.course?.methodology === 'CODE'
    ? null
    : preguntaDelTurno({
      actual: currentActivity,
      siguiente: nextActivityData ?? undefined,
      avanza: verification.ready_to_advance === true || cierraPorTope,
      esUltima: currentActivityContext.isLastActivity,
      respuestaFija: respuestaFija !== null,
      pasoCerrado: !!choiceTurn || !!checkTurn,
      yaCompletada: activityAlreadyCompleted,
      sinVerificar: verification.unverified === true,
      turnoDeConexion: esTurnoDeConexion,
    })

  const { staticBlocks, dynamicPrompt: dynamicPromptBase } = buildSystemPrompt({
    activityContext: currentActivityContext,
    recentMessages: sessionWithMessages.messages,
    tangentCount,
    attempts,
    verificationResult: cierraPorTope ? { ...verification, ready_to_advance: true } : verification,
    cierraPorTope,
    completedActivities: completedActivityIds,
    intentClassification: intent,
    lessonContext,
    nextActivity: nextActivityData || undefined,
    methodology: lessonSession.lesson.course?.methodology ?? 'REFLECTIVE',
    projectBrief: lessonSession.projectBrief ?? undefined,
    wasExplained,
    sessionSeed,
    choiceState,
    choiceTurn,
    pinnedBlocks: blocksForActivity(contentJson, currentActivity.id, verSinValidar).pinned,
    isTest: verSinValidar,
    cited: materialCitado,
    aclaracion: pidioAclaracion
      ? (attempts === 0 && currentActivity.teaching?.first_question) || currentActivity.verification.question
      : undefined,
    preguntaDelCodigo: preguntaFinal,
  })

  // Turno de conexión: el alumno respondió una bienvenida genérica. Sophia
  // reconoce lo que dijo y plantea AHORA la actividad 1 (antes la daba por hecha).
  const dynamicPrompt = esTurnoDeConexion
    ? dynamicPromptBase + `

ESTADO: CONEXIÓN — el estudiante acaba de responder tu pregunta de bienvenida; todavía NO ha visto la actividad.
CÓMO RESPONDER (máximo 90 palabras):
1. Empieza con "Bien." o "Gracias." y reconoce en 1 oración algo concreto de lo que dijo. PROHIBIDO "Correcto", "Exacto" o "Perfecto": no respondió ninguna pregunta evaluable.
2. Plantea la actividad según tu instrucción, con todo el material que necesita para responder (caso, fragmento).
3. ${choice ? 'Termina con el PASO CERRADO tal como figura abajo (opciones con letra, una por línea) y pide una letra. NO hagas aún la pregunta abierta.' : `Termina con la pregunta: "${currentActivity.teaching?.first_question ?? currentActivity.verification.question}"`}`
    : dynamicPromptBase

  // ═══════════════════════════════════════════════════════════════
  // 6. CREATE STREAMING RESPONSE CON PROMPT CACHING
  // ═══════════════════════════════════════════════════════════════
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  // Si el estudiante adjuntó archivos (imágenes / PDF), los convertimos en
  // bloques nativos de Claude para inyectarlos en el último mensaje del usuario.
  // Cualquier nota textual (formatos no soportados, etc.) se anexa al mensaje.
  const { blocks: attachmentBlocks, notes: attachmentNotes } =
    attachments && attachments.length > 0
      ? await processPlannerAttachments(attachments)
      : { blocks: [], notes: [] }

  const userMessageContent: string | Array<{ type: 'text'; text: string } | typeof attachmentBlocks[number]> =
    attachmentBlocks.length > 0
      ? [
          {
            type: 'text' as const,
            text:
              attachmentNotes.length > 0
                ? `${message}\n\n${attachmentNotes.join('\n\n')}`
                : message,
          },
          ...attachmentBlocks,
        ]
      : message

  // Lo subrayado en este turno, ya revisado: queda en el mensaje del alumno (se
  // ve en la conversación, en la ficha y en la transcripción) y se manda al
  // navegador ANTES del texto de Sophia, para que la línea vibre y se ponga
  // roja mientras ella responde.
  const subrayadoDelTurno = estadosDeSubrayado
    .filter(esSubrayadoNuevo)
    .map(({ b, state }) => {
      const r = evaluarSubrayado(b, state)
      const resultado = r === 'respalda' || r === 'no_respalda' ? r : undefined
      const revelada = resultado === 'no_respalda' && revelarSubrayado && subrayadoQueNoRespalda?.b.id === b.id ? lineasClaveTexto(b) : undefined
      const respaldan = resultado === 'respalda' ? subrayadasQueRespaldan(b, state) : undefined
      return paraGuardar(b, state, { ...(resultado ? { resultado } : {}), ...(revelada ? { revelada } : {}), ...(respaldan ? { respaldan } : {}) })
    })
    .filter((x): x is NonNullable<typeof x> => !!x)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (subrayadoDelTurno.length) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'subrayado', material: { subrayado: subrayadoDelTurno } })}\n\n`))
        }
        // Stream from Claude con bloques cacheables
        // maxTokens dinámico basado en complexity de la actividad
        const maxTokens = getMaxTokensForActivity(currentActivity.complexity)

        // Comprobación de cierre: la respuesta la escribe el código (sin modelo).
        const claudeStream = respuestaFija !== null ? streamFijo(respuestaFija) : await anthropic.messages.stream({
          model: TUTOR_MODEL,
          max_tokens: maxTokens,
          system: [
            ...staticBlocks,
            { type: 'text', text: dynamicPrompt + estadoPanelClause + estadoClasifClause + estadoSubrayadoClause + guiaDeSubrayado }
          ],
          messages: [
            ...compressedHistory,  // Historial comprimido (preguntas visibles)
            {
              role: 'user',
              content: userMessageContent,
            },
          ],
        })

        // Process stream events.
        // El marcador PROJECT_BRIEF (---PROJECT_BRIEF---{...}---END_PROJECT_BRIEF---)
        // se persiste server-side pero NUNCA debe verse en vivo al estudiante.
        // Buffer pequeño que retiene los últimos ~25 chars antes de reenviar al
        // cliente, así detectamos el inicio del marcador aunque venga partido en
        // varios chunks. Cuando aparece, suprimimos todo lo posterior.
        const PROJECT_BRIEF_MARK = '---PROJECT_BRIEF---'
        const HOLDBACK = PROJECT_BRIEF_MARK.length + 5
        let unsent = ''
        let suppressFurther = false

        const flushToClient = (text: string) => {
          if (!text) return
          const data = JSON.stringify({ type: 'content', text })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        // Marcadores del panel: los inválidos se quitan antes de enviar y guardar;
        // uno partido entre trozos se retiene hasta saber si vale.
        const filtroMarcadores = createMarkerFilter(marcadorValido)
        // Voseo corregido en el código (lib/voseo.ts): «Mirá» → «Mira».
        const correctorVoseo = crearCorrectorDeVoseo()
        // Títulos del material entre «» (lib/titulos-material.ts): «toca en el texto Cuándo…».
        const correctorTitulos = crearCorrectorDeTitulos(allLessonBlocks(contentJson, verSinValidar).map((b) => b.title))
        // La calificación («Exacto.», «Correcto.») se quita en el código
        // (lib/calificacion.ts): en un paso sin nota siempre, y en uno con nota si
        // el verificador no aprobó, aunque el código avance por tope o desglose.
        const quitador = debeQuitarCalificacion({
          evaluativa: currentActivity.verification.is_evaluative !== false,
          respuestaFija: respuestaFija !== null,
          aproboElVerificador: aproboElVerificador && verification.ready_to_advance === true,
          pasoCerrado: !!choiceTurn || !!checkTurn,
        })
          ? crearQuitadorDeCalificaciones()
          : null
        // Si la pregunta la pone el código, las que escriba Sophia no salen.
        const quitadorDePreguntas = preguntaFinal ? crearQuitadorDePreguntas() : null
        const limpiar = (trozo: string) => {
          const sinCalificar = quitador ? quitador.push(trozo) : trozo
          return quitadorDePreguntas ? quitadorDePreguntas.push(sinCalificar) : sinCalificar
        }
        const vaciarLimpieza = () => {
          const resto = quitador?.flush() ?? ''
          return quitadorDePreguntas ? quitadorDePreguntas.push(resto) + quitadorDePreguntas.flush() : resto
        }

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              if (marcas.primer_token === undefined) marcar('primer_token')
              const text = limpiar(correctorTitulos.push(correctorVoseo.push(filtroMarcadores.push(event.delta.text))))
              if (!text) continue
              fullResponse += text
              if (suppressFurther) continue

              unsent += text
              const markerIdx = unsent.indexOf(PROJECT_BRIEF_MARK)
              if (markerIdx >= 0) {
                // Mandar la parte conversacional anterior al marcador y cortar.
                flushToClient(unsent.slice(0, markerIdx))
                suppressFurther = true
                unsent = ''
                continue
              }

              // Retener los últimos HOLDBACK chars por si el marcador llega partido.
              if (unsent.length > HOLDBACK) {
                flushToClient(unsent.slice(0, -HOLDBACK))
                unsent = unsent.slice(-HOLDBACK)
              }
            }
          } else if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
        }

        marcar('stream')

        // Lo que retuvo el filtro de marcadores al final del texto.
        const restoMarcadores = limpiar(correctorTitulos.push(correctorVoseo.push(filtroMarcadores.flush()) + correctorVoseo.flush()) + correctorTitulos.flush()) + vaciarLimpieza()
        if (restoMarcadores) {
          fullResponse += restoMarcadores
          if (!suppressFurther) unsent += restoMarcadores
        }

        // Eligió mal y le quedan intentos: el modelo no puede mencionar opciones
        // (sería pista), así que el código vuelve a listarlas TODAS, con las
        // mismas letras. Sin esto el alumno se queda sin alternativas a la
        // vista y sin botones para elegir otra.
        if (choiceTurn === 'pick_wrong_retry' && choice && choiceState) {
          const opciones = `\n\n${renderChoice(choice, choiceState.order).split('\n').filter((l) => /^[A-E]\) /.test(l)).join('\n')}`
          fullResponse += opciones
          if (!suppressFurther) unsent += opciones
        }

        // Drenar el buffer si no apareció el marcador (caso normal sin brief).
        if (!suppressFurther && unsent) flushToClient(unsent)

        // Si Sophia emitió un PROJECT_BRIEF (cursos basados en proyecto),
        // extrae el JSON y limpia el marcador del mensaje persistido.
        const { brief: projectBrief, cleaned } = extractProjectBrief(fullResponse)
        let cleanedAssistantContent = cleaned

        // La pregunta de la actividad, escrita por el código (lib/perfil-curso.ts).
        const preguntaAgregada = preguntaFinal !== null
        if (preguntaFinal !== null) {
          const pregunta = `${cleanedAssistantContent.trim() ? '\n\n' : ''}${preguntaEnNegrita(preguntaFinal)}`
          flushToClient(pregunta)
          cleanedAssistantContent = cleanedAssistantContent.trimEnd() + pregunta
        }

        // Fallback anti-burbuja-vacía: si el modelo devolvió una respuesta
        // vacía (o solo whitespace / solo un brief suprimido), el estudiante
        // quedaría mirando un mensaje en blanco sin saber cómo continuar
        // (observado en sesiones reales: tuvo que escribir "continua"/"ok").
        // Re-planteamos la pregunta de la actividad vigente para re-anclar.
        if (!cleanedAssistantContent.trim()) {
          const fallbackText = `Retomemos donde estábamos. ${currentActivity.verification.question}`
          logger.warn('chat.stream.empty_response_fallback', {
            sessionId,
            activityId: currentActivity.id,
            fullResponseLength: fullResponse.length,
            hadBrief: projectBrief !== null,
          })
          flushToClient(fallbackText)
          cleanedAssistantContent = fallbackText
        }

        // ── Puntero y conversación juntos ────────────────────────────────
        // El verificador puede aprobar la actividad, pero si Sophia NO pasó a la
        // siguiente (siguió pidiendo «muéstrame el cálculo») y el puntero avanza
        // igual, la próxima respuesta del alumno se evalúa contra una actividad
        // que nunca se planteó. Primera vez: el puntero se queda y la actividad
        // se vuelve a verificar con la respuesta que Sophia está pidiendo.
        // Segunda vez: se avanza y se agrega la pregunta siguiente al mensaje.
        // Cierre con comprobación: la primera pregunta la agrega el código, igual
        // en orden y letras a como la va a corregir (newChecksState es determinista).
        const avanzaEsteTurno = verification.ready_to_advance || cierraPorTope
        if (avanzaEsteTurno && !activityAlreadyCompleted && verification.unverified !== true && nextActivityData?.checks?.length) {
          const intro = `\n\n${checksIntro(nextActivityData.checks, newChecksState(sessionSeed, nextActivityData.id, nextActivityData.checks))}`
          flushToClient(intro)
          cleanedAssistantContent += intro
        }
        if (avanzaEsteTurno && !activityAlreadyCompleted && verification.unverified !== true) {
          // Si la pregunta siguiente ya la puso el código, no hay nada que retener ni pegar.
          const siguioElGuion = preguntaAgregada || (currentActivityContext.isLastActivity
            ? !cleanedAssistantContent.includes('?')
            : nextActivityData
              ? nextActivityData.checks?.length
                ? true
                : planteaLaPregunta(cleanedAssistantContent, nextActivityData.choice?.prompt ?? nextActivityData.teaching?.first_question ?? nextActivityData.verification.question)
              : true)
          if (!siguioElGuion) {
            const retenciones = (existingEvidence as { heldBack?: number }).heldBack ?? 0
            // Si Sophia no dejó ninguna pregunta abierta (cerró, agradeció), no hay
            // conversación que desfasar: se avanza ya y se agrega la pregunta
            // siguiente. Retener solo tiene sentido cuando pidió OTRA cosa.
            // En un paso sin nota de un turno (rutina) tampoco: no hay tema que
            // cerrar, y retener le costaba al alumno un turno (20 oct 2026).
            if (!cierraPorTope && !sinNotaDeUnTurno && retenciones < 1 && terminaEnPregunta(cleanedAssistantContent)) {
              verification.ready_to_advance = false
              verification.completed = false
              retenido = true
              logger.info('chat.stream.advance_held_back', {
                sessionId,
                activityId: currentActivity.id,
                isLast: currentActivityContext.isLastActivity,
              })
            } else if (nextActivityData) {
              const pregunta = `\n\n${nextActivityData.choice?.prompt ?? nextActivityData.teaching?.first_question ?? nextActivityData.verification.question}`
              flushToClient(pregunta)
              cleanedAssistantContent += pregunta
              logger.info('chat.stream.next_question_appended', { sessionId, activityId: currentActivity.id })
            }
          }
        }
        // Cierre de la lección: el resumen y el agradecimiento los escribe el código,
        // con los puntos clave literales (lib/cierre.ts). Sophia solo recoge la duda.
        if (
          avanzaEsteTurno && !activityAlreadyCompleted && verification.unverified !== true && !retenido &&
          currentActivityContext.isLastActivity && lessonKeyPoints.length > 0
        ) {
          const resumen = `\n\n${resumenDeCierre(lessonKeyPoints)}`
          flushToClient(resumen)
          cleanedAssistantContent += resumen
        }

        // ── La actividad sigue abierta: el mensaje tiene que terminar preguntando ──
        // Prueba del 12 oct 2026: con el criterio aún sin cubrir, Sophia dijo
        // «Exacto… Gracias por participar en esta actividad» y no preguntó nada.
        // El alumno creyó que la lección había terminado. Si la actividad no
        // avanza y el mensaje no deja una pregunta, se agrega la pendiente: la
        // sub-pregunta del desglose o, si no hay, la de la actividad. No aplica a
        // la comprobación (la escribe el código), al paso cerrado (sus opciones
        // las maneja su propio flujo) ni al avance forzado por intentos.
        const avanzaPorIntentos =
          !verification.ready_to_advance &&
          verification.response_type !== 'continuation' &&
          !hallucinationCheck.isHallucination &&
          !desvioEnPasoSinNota &&
          attempts + 1 >= (currentActivity.verification.max_attempts || 3)
        if (
          !verification.ready_to_advance &&
          !activityAlreadyCompleted &&
          !retenido &&
          !preguntaAgregada &&
          respuestaFija === null &&
          !choiceTurn &&
          !avanzaPorIntentos &&
          // Tras un desvío en la rutina, la pregunta del paso tiene que quedar en el mensaje.
          (!turnoSinEvaluar || desvioEnPasoSinNota) &&
          !terminaEnPregunta(cleanedAssistantContent)
        ) {
          // Sin intentos todavía, una actividad que abre con otra pregunta (la
          // predicción del ecualizador) sigue en esa; el porqué viene después.
          const pendiente = willScaffold && verification.next_subquestion
            ? verification.next_subquestion
            : attempts === 0 && scaffoldingTurns === 0 && currentActivity.teaching?.first_question
              ? currentActivity.teaching.first_question
              : currentActivity.verification.question
          const agregado = `\n\n${pendiente}`
          flushToClient(agregado)
          cleanedAssistantContent += agregado
          logger.warn('chat.stream.open_activity_question_appended', {
            sessionId,
            activityId: currentActivity.id,
            fuente: willScaffold ? 'desglose' : 'actividad',
          })
        }

        // 4. Save messages to database (con activityId y timestamps explícitos para orden correcto)
        const userTimestamp = new Date()
        const assistantTimestamp = new Date(userTimestamp.getTime() + 1) // +1ms para garantizar orden

        // Desfase de activityId: la respuesta del alumno pertenece a la actividad
        // de la PREGUNTA que contesta, no al puntero de la sesión. Si el turno
        // anterior avanzó de actividad mientras Sophia seguía cerrando la previa
        // (el follow-up descrito en 77a0ea1), el puntero ya apunta a la siguiente
        // y el mensaje quedaría archivado bajo la actividad equivocada.
        // `messages` ya está en orden ascendente (ver `ultimoDe`): se busca desde el final.
        const answeredActivityId =
          ultimoDe('assistant')?.activityId ?? currentActivity.id

        const [, assistantMessage] = await prisma.$transaction([
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'user',
              content: message,
              activityId: answeredActivityId,
              ...(subrayadoDelTurno.length ? { material: { subrayado: subrayadoDelTurno } } : {}),
              timestamp: userTimestamp,
            },
          }),
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'assistant',
              content: cleanedAssistantContent,
              inputTokens,
              outputTokens,
              activityId: currentActivity.id,
              timestamp: assistantTimestamp,
            },
          }),
          prisma.lessonSession.update({
            where: { id: sessionId },
            data: {
              lastActivityAt: assistantTimestamp,
              ...(projectBrief !== null
                ? { projectBrief: projectBrief as Prisma.InputJsonValue }
                : {}),
            },
          }),
        ])

        if (projectBrief !== null) {
          logger.info('chat.stream.project_brief_saved', {
            sessionId,
            userId: session.userId,
          })
        }

        // Log chat message
        logChatMessage(sessionId, 'assistant', fullResponse.length, {
          input: inputTokens,
          output: outputTokens,
        })


        /**
         * Cierra la lección: nota, completedAt, progreso e informe.
         *
         * Vive en una función porque hay DOS caminos que terminan la última
         * actividad y solo uno la cerraba. El otro es el avance forzado a los 5
         * intentos: marcaba la actividad como completada, buscaba la siguiente,
         * no encontraba ninguna y no hacía nada más — la sesión quedaba abierta
         * para siempre, sin nota. Y como las actividades de cierre promedian
         * 5-7 intentos, el bug caía justo donde más pasa: 38 sesiones terminadas
         * que figuraban «a medias», 22 de ellas en la S1.
         */
        const cerrarLeccion = async () => {
const allActivities = await prisma.activityProgress.findMany({
              where: {
                lessonSessionId: lessonSession.id,
                status: 'COMPLETED',
              },
              select: {
                activityId: true,
                attempts: true,
                tangentCount: true,
                evidenceData: true,
                passedCriteria: true,
              },
            })

            // Punto ÚNICO de cálculo. Antes este camino armaba la nota por su
            // cuenta —sin pesos por tipo y sin denominador esperado— así que un
            // mismo alumno sacaba distinto según entrara por el chat o por el
            // kiosko.
            const grade = notaDeLaSesion(
              contentJson.activities,
              allActivities,
              lessonSession.lesson.course?.methodology
            )

            logger.info('chat.stream.grade_calculated', {
              sessionId,
              totalActivitiesCompleted: allActivities.length,
              grade,
            })

            // grade null = la evidencia no permite afirmar nada. La sesión se
            // cierra igual, sin nota: mejor una casilla vacía que un número
            // inventado sobre evidencia rota.
            await prisma.lessonSession.update({
              where: { id: lessonSession.id },
              data: {
                completedAt: new Date(),
                passed: grade !== null && isPassing(grade),
                progress: 100,
                grade,
              },
            })

            logger.info('chat.stream.lesson_completed', {
              sessionId,
              totalActivities: getTotalActivities(contentJson),
              completedActivities: allActivities.length,
              grade,
              duration: new Date().getTime() - new Date(lessonSession.startedAt).getTime(),
            })

        }

        // 5. Guardar resultado de verificación en ActivityProgress
        // (La verificación ya corrió ANTES del streaming, usamos ese resultado)
        // Usar ready_to_advance en lugar de solo completed para mayor flexibilidad
        // Verificador caído: el intento se guarda SIN nivel ni criterios, para
        // que no puntúe hasta que scripts/reverificar-pendientes.ts lo evalúe
        // sobre la respuesta guardada. Antes se guardaba un nivel inventado.
        const sinVerificar = verification.unverified === true

        if (choiceTurn && choiceState) {
          // Paso cerrado: guardar su estado; los intentos del paso 2 no se tocan.
          // (Si eligió bien y justificó en el mismo mensaje, choiceTurn ya es
          // undefined y el estado se guarda con el intento, más abajo.)
          evidenciaEscrita = true
          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: { evidenceData: JSON.parse(JSON.stringify({ ...existingEvidence, choice: choiceState, ...panelExtra })) },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: 0,
              startedAt: new Date(),
              evidenceData: JSON.parse(JSON.stringify({ attempts: [], choice: choiceState, ...panelExtra })),
            },
          })
        } else if (checkTurn && checksState) {
          // Comprobación de cierre: guardar su estado; la reflexión sigue después.
          evidenciaEscrita = true
          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: { evidenceData: JSON.parse(JSON.stringify({ ...existingEvidence, checks: checksState, ...panelExtra })) },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: 0,
              startedAt: new Date(),
              evidenceData: JSON.parse(JSON.stringify({ attempts: [], checks: checksState, ...panelExtra })),
            },
          })
        } else if (verification.ready_to_advance) {
          // Marcar actividad como completada
          // Construir evidenceData con historial de intentos (como Instructoria)
          const newAttempt = {
            studentResponse: respuestaParaGuardar,
            analysis: {
              ready_to_advance: verification.ready_to_advance,
              completed: verification.completed,
              criteriaMatched: verification.criteriaMatched,
              criteriaMissing: verification.criteriaMissing,
              understanding_level: sinVerificar ? undefined : verification.understanding_level,
              response_type: sinVerificar ? undefined : verification.response_type,
              completeness_percentage: sinVerificar ? undefined : verification.completeness_percentage,
              student_intent: verification.student_intent,
              unverified: sinVerificar || undefined,
            },
            timestamp: new Date().toISOString(),
          }
          const updatedEvidence = JSON.parse(JSON.stringify({
            attempts: [...(existingEvidence.attempts || []), newAttempt],
            // Conservar el paso cerrado: sin esto el turno abierto lo borraba y
            // el siguiente mensaje volvía a leerse como elección.
            ...(choiceState ? { choice: choiceState } : {}),
            ...(checksState ? { checks: checksState } : {}),
            // Preservar el conteo de desglose (informativo: cuántas sub-preguntas se usaron antes de completar)
            scaffoldingTurns,
            // Mantener el flag de explicación si ya se dio o se va a dar ahora
            wasExplained: wasExplained || willExplainThisTurn,
            ...panelExtra,
          }))

          evidenciaEscrita = true
          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              status: 'COMPLETED',
              completedAt: new Date(),
              // Sin verificar no es «cumplió»: queda false hasta la re-verificación.
              passedCriteria: !sinVerificar,
              aiFeedback: sinVerificar
                ? 'Sin verificar: el verificador no respondió. Pendiente de re-verificación.'
                : verification.feedback,
              attempts: attempts + 1,
              evidenceData: updatedEvidence,
            },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'COMPLETED',
              completedAt: new Date(),
              passedCriteria: !sinVerificar,
              aiFeedback: sinVerificar
                ? 'Sin verificar: el verificador no respondió. Pendiente de re-verificación.'
                : verification.feedback,
              attempts: attempts + 1,
              evidenceData: updatedEvidence,
            },
          })

          if (sinVerificar) {
            logger.warn('chat.stream.activity_unverified', {
              sessionId,
              activityId: currentActivity.id,
            })
          }

          logger.info('chat.stream.activity_completed', {
            sessionId,
            activityId: currentActivity.id,
            attempts: attempts + 1,
            criteriaMatched: verification.criteriaMatched.length,
          })

          // 🔥 NUEVO: Notificar al frontend inmediatamente vía SSE
          const nextActivityContext = getNextActivity(contentJson, currentActivity.id)
          const totalActivities = getTotalActivities(contentJson)
          // Completadas tras el upsert de arriba: las que ya venían con la
          // sesión (sin contar esta, por si ya figuraba) más la de este turno.
          const completedCount =
            lessonSession.activities.filter((a) => a.status === 'COMPLETED' && a.activityId !== currentActivity.id).length + 1

          const activityCompletedData = JSON.stringify({
            type: 'activity_completed',
            activityId: currentActivity.id,
            activityTitle: currentActivity.verification.question, // Usar pregunta como título
            nextActivityId: nextActivityContext?.activityId || null,
            nextActivityTitle: nextActivityContext ? 'Siguiente actividad' : null,
            isLastActivity: !nextActivityContext,
            currentPosition: completedCount + 1,
            completedCount: completedCount + 1,
            total: totalActivities,
            percentage: Math.round(((completedCount + 1) / totalActivities) * 100),
            completedAt: new Date().toISOString(),
          })

          // Enviar evento SSE al frontend para actualización instantánea
          controller.enqueue(encoder.encode(`data: ${activityCompletedData}\n\n`))

          logger.info('chat.stream.activity_completed_event_sent', {
            sessionId,
            activityId: currentActivity.id,
            percentage: Math.round(((completedCount + 1) / totalActivities) * 100),
          })

          // Auto-progresión a siguiente actividad (ahora usa nextActivityContext ya calculado)

          if (nextActivityContext) {
            // Hay siguiente actividad → actualizar sesión.
            // La respuesta de Sophia en este mismo turno es la de transición:
            // introduce la actividad NUEVA, así que se archiva bajo ella. Con eso
            // el próximo mensaje del alumno hereda la actividad correcta.
            // Las dos escrituras van juntas: una ida y vuelta en vez de dos.
            await prisma.$transaction([
              prisma.lessonSession.update({
                where: { id: lessonSession.id },
                data: {
                  activityId: nextActivityContext.activityId,
                  lastActivityAt: new Date(),
                },
              }),
              prisma.message.update({
                where: { id: assistantMessage.id },
                data: { activityId: nextActivityContext.activityId },
              }),
            ])

            logger.info('chat.stream.activity_progressed', {
              sessionId,
              fromActivityId: currentActivity.id,
              toActivityId: nextActivityContext.activityId,
            })
          } else {
            // Era la última actividad → cerrar la lección
            await cerrarLeccion()
          }
        } else if (verification.response_type !== 'continuation' && !hallucinationCheck.isHallucination) {
          // Guardar evidencia + (condicionalmente) incrementar attempts.
          // Skip si: continuación ("sí", "listo") o hallucination de voz.
          //
          // FIX causa #13: cuando willScaffold === true significa que Sophia
          // va a desglosar el tema en una sub-pregunta. La respuesta del
          // estudiante NO es un intento fallido del criterio total — es
          // progreso parcial pedido por Sophia. Si lo contamos como attempt,
          // castigamos con penalty 0.90× a quien aprende incrementalmente
          // (el bug observado con María Céspedes en el demo del 03/06).
          // Solo incrementamos attempts cuando es un RETRY real del criterio
          // (sin scaffolding en curso).
          const failedAttempt = {
            studentResponse: respuestaParaGuardar,
            analysis: {
              ready_to_advance: verification.ready_to_advance,
              completed: verification.completed,
              criteriaMatched: verification.criteriaMatched,
              criteriaMissing: verification.criteriaMissing,
              understanding_level: verification.understanding_level,
              response_type: verification.response_type,
              completeness_percentage: verification.completeness_percentage,
              student_intent: verification.student_intent,
              wasScaffolding: willScaffold, // marca para auditoría/scoring
            },
            timestamp: new Date().toISOString(),
          }
          // Desfase de actividad: cuando el alumno contesta OTRO tema (p.ej. un
          // follow-up de Sophia sobre el tema anterior, justo después de avanzar),
          // el verificador lo marca off_topic. NO es un intento fallido de ESTE
          // criterio → no lo guardamos como intento puntuado ni incrementamos el
          // contador, para que no arrastre el promedio de la nota.
          const isOffTopic = verification.response_type === 'off_topic'
          const failedEvidence = JSON.parse(JSON.stringify({
            attempts: isOffTopic || turnoSinEvaluar
              ? (existingEvidence.attempts || [])
              : [...(existingEvidence.attempts || []), failedAttempt],
            // Conservar y avanzar el contador de desglose si Sophia va a desglosar
            scaffoldingTurns: willScaffold ? scaffoldingTurns + 1 : scaffoldingTurns,
            // Mantener/setear el flag de explicación didáctica
            wasExplained: wasExplained || willExplainThisTurn,
            // Veces que se retuvo el avance por desfase con la conversación
            heldBack: ((existingEvidence as { heldBack?: number }).heldBack ?? 0) + (retenido ? 1 : 0),
            // Ya se pidió subrayar en esta actividad: no se vuelve a pedir.
            ...((existingEvidence as { subrayadoPedido?: boolean }).subrayadoPedido || turnoDeSubrayar ? { subrayadoPedido: true } : {}),
            // La aprobación de la respuesta escrita, mientras falta tocar la línea.
            ...(aprobacionAlPedirLinea ? { aprobadaSinLinea: aprobacionAlPedirLinea } : aprobadaSinLinea ? { aprobadaSinLinea } : {}),
            ...(fallosDeSubrayado || revisarSubrayado ? { subrayadoFallos: fallosDeSubrayado + (revisarSubrayado ? 1 : 0) } : {}),
            ...(choiceState ? { choice: choiceState } : {}),
            ...(checksState ? { checks: checksState } : {}),
            ...panelExtra,
          }))

          // Scaffolding y off_topic NO cuentan attempt — solo evidencia/contexto.
          // Retenido: el alumno cumplió, solo se esperó a que Sophia cerrara el tema.
          const attemptsIncrement = (willScaffold || isOffTopic || retenido || turnoSinEvaluar || lineaEquivocadaSola) ? 0 : 1

          evidenciaEscrita = true
          await prisma.activityProgress.upsert({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            update: {
              attempts: attempts + attemptsIncrement,
              evidenceData: failedEvidence,
            },
            create: {
              lessonSessionId: lessonSession.id,
              activityId: currentActivity.id,
              status: 'IN_PROGRESS',
              attempts: attemptsIncrement,
              evidenceData: failedEvidence,
            },
          })

          if (willScaffold) {
            logger.info('chat.stream.scaffolding_progress', {
              sessionId,
              activityId: currentActivity.id,
              scaffoldingTurns: scaffoldingTurns + 1,
              attempts, // sin cambio
            })
          }

          // Forzar avance al llegar a 5 intentos
          // La IA ya dio la respuesta en el intento 5 (prompt-builder maneja esto)
          // Marcamos como completado con nivel "En inicio"
          // Mismo tope que usa el prompt (prompt-builder: max_attempts || 3). Antes
          // el código esperaba 5 mientras Sophia ya «avanzaba» en el 3: desfase.
          // Los desgloses cuentan (intentosPrevios): igual que cierraPorTope.
          const forcedAdvanceLimit = topeDeIntentos
          const newAttemptCount = intentosPrevios + 1

          // Si este turno retuvo el avance (Sophia no planteó la actividad
          // siguiente), no se fuerza aquí: el turno que viene avanza con la
          // pregunta. 20 oct 2026: en una actividad de un intento se retuvo y se
          // forzó en el mismo turno; el puntero pasó a la actividad siguiente
          // sin que Sophia la enseñara.
          if (newAttemptCount >= forcedAdvanceLimit && !retenido && !turnoSinEvaluar && !lineaEquivocadaSola && !isOffTopic) {
            // Buscar el mejor intento (mayor completeness_percentage)
            type AttemptAnalysis = { understanding_level?: string; completeness_percentage?: number }
            type AttemptRecord = { analysis?: AttemptAnalysis }
            const allAttempts = (existingEvidence.attempts || []) as AttemptRecord[]
            const currentAttempt: AttemptRecord = {
              analysis: {
                understanding_level: verification.understanding_level,
                completeness_percentage: verification.completeness_percentage,
              }
            }
            const bestAttempt = [...allAttempts, currentAttempt].reduce((best, att) => {
              const pct = att.analysis?.completeness_percentage || 0
              const bestPct = best.analysis?.completeness_percentage || 0
              return pct > bestPct ? att : best
            })

            const bestLevel = LEVEL_LABEL_ES[normalizeLevel(bestAttempt.analysis?.understanding_level)]

            // Mark activity as completed by limit
            await prisma.activityProgress.update({
              where: {
                lessonSessionId_activityId: {
                  lessonSessionId: lessonSession.id,
                  activityId: currentActivity.id,
                },
              },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                passedCriteria: false, // Did not pass on merit
                aiFeedback: `Avanzó por límite de intentos (${forcedAdvanceLimit}). Mejor nivel: ${bestLevel}`,
              },
            })

            // Auto-advance to next activity
            const currentIdx = contentJson.activities.findIndex((a: { id: string }) => a.id === currentActivity.id)
            const nextAct = contentJson.activities[currentIdx + 1]

            if (nextAct) {
              // Igual que en el avance normal: la respuesta de este turno ya
              // pertenece a la actividad nueva. Las dos escrituras van juntas.
              await prisma.$transaction([
                prisma.lessonSession.update({
                  where: { id: lessonSession.id },
                  data: { activityId: nextAct.id },
                }),
                prisma.message.update({
                  where: { id: assistantMessage.id },
                  data: { activityId: nextAct.id },
                }),
              ])
            } else {
              // No hay siguiente: el avance forzado ocurrió EN la última
              // actividad, así que la lección terminó acá. Antes este camino no
              // cerraba nada.
              await cerrarLeccion()
            }

            // Notify frontend
            const forcedAdvanceData = JSON.stringify({
              type: 'forced_advance',
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              bestLevel,
              nextActivityId: nextAct?.id || null,
            })
            controller.enqueue(encoder.encode(`data: ${forcedAdvanceData}\n\n`))

            logger.info('chat.stream.forced_advance', {
              sessionId,
              activityId: currentActivity.id,
              attempts: newAttemptCount,
              bestLevel,
              nextActivityId: nextAct?.id || null,
            })
          }
        }

        // 5. Detectar tangents e incrementar contador
        // 🔥 FIX: Un tangent es cuando el mensaje es OFF-TOPIC según intent classification
        // NO cuando simplemente no cumple criterios (podría ser pregunta de clarificación válida)
        const isTangent = !intent.is_on_topic || intent.intent === 'off_topic' || intent.intent === 'small_talk'

        if (isTangent) {
          await prisma.activityProgress.update({
            where: {
              lessonSessionId_activityId: {
                lessonSessionId: lessonSession.id,
                activityId: currentActivity.id,
              },
            },
            data: {
              tangentCount: tangentCount + 1,
            },
          })

          logger.info('chat.stream.tangent_detected', {
            sessionId,
            activityId: currentActivity.id,
            tangentCount: tangentCount + 1,
            maxAllowed: 3, // Valor fijo para tangentes
          })
        }

        // Estado de los ecualizadores en este turno, para la transcripción y el
        // Monitor (spec del panel §16.3). Si el turno ya escribió evidencia, fue
        // con el estado incluido (panelExtra); acá queda solo el turno que no
        // escribió nada (una continuación) sobre una fila que ya existe. Nunca
        // incluye «Mis notas».
        if (Object.keys(panelGuardable).length && !evidenciaEscrita && activityProgress) {
          try {
            await prisma.activityProgress.update({
              where: { lessonSessionId_activityId: { lessonSessionId: lessonSession.id, activityId: currentActivity.id } },
              data: { evidenceData: JSON.parse(JSON.stringify({ ...existingEvidence, panelState: panelGuardable })) },
            })
          } catch (e) {
            logger.warn('chat.stream.panel_state_not_saved', { sessionId, error: String(e) })
          }
        }
        marcar('guardado')
        logger.info('chat.stream.timing', { sessionId, ...marcas })

        // 6. Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        logError(
          error as Error,
          'chat.stream.error',
          { sessionId, userId: session.userId }
        )
        const errorData = JSON.stringify({
          type: 'error',
          message: 'Error al procesar respuesta',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * ¿El mensaje de Sophia deja algo que responder? Mira el último párrafo, sin
 * marcadores del panel: una pregunta, alternativas «A) …», o un pedido sin
 * signo de pregunta («Reescribe esta oración…», «Mueve el TC2 a 0…»). Lo
 * último faltaba: el 13 oct «reescribe…» se tomó por cierre y se le pegó
 * debajo la pregunta de la actividad siguiente.
 */
const PEDIDO_IMPERATIVO = /(^|[.:;!]\s+)(reescribe|redacta|escribe|explica|describe|dime|cuéntame|indica|menciona|calcula|propón|elige|compara|identifica|señala|completa|resume|mueve|baja|sube|carga|prueba|lee|mira|ubica|justifica|toca|subraya|marca)\b/i
function terminaEnPregunta(texto: string): boolean {
  const lineas = stripMarkers(texto).split('\n').map((l) => l.trim()).filter(Boolean)
  const ultima = lineas.at(-1) ?? ''
  return ultima.includes('?') || /^[A-E]\)\s/.test(ultima) || PEDIDO_IMPERATIVO.test(ultima)
}

/** Una respuesta escrita por el código, con la forma de los eventos de Claude. */
async function* streamFijo(texto: string): AsyncGenerator<Anthropic.Messages.RawMessageStreamEvent> {
  yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: texto } }
}
