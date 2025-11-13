/**
 * 🤖 AI Configuration - Centro de Control de Sophia
 *
 * Este archivo centraliza TODAS las configuraciones relacionadas con AI/LLM en el sistema.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REGLA OBLIGATORIA:
 * ═══════════════════════════════════════════════════════════════════════════
 * Cualquier valor relacionado con modelos, tokens, límites, o comportamiento
 * de IA DEBE estar definido aquí. NO hardcodear valores en otros archivos.
 *
 * Ver CLAUDE.md sección "🤖 AI Config Protocol" para workflow completo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ARQUITECTURA DE MEMORIA:
 *
 * Sophia usa una arquitectura de doble-prompt con memoria conversacional:
 *
 *   1. VERIFICATION PROMPT (ejecutado PRIMERO)
 *      - Evalúa si el estudiante completó los criterios de la actividad
 *      - SIN historial conversacional (optimización de tokens)
 *      - Output: JSON estructurado con completed/criteriaMatched/feedback
 *
 *   2. SYSTEM PROMPT (ejecutado DESPUÉS)
 *      - Usa el resultado de verificación para dar feedback personalizado
 *      - SIN historial conversacional (instrucciones estáticas)
 *      - Recibe contexto pedagógico de la actividad actual
 *
 *   3. MESSAGES ARRAY (memoria real del sistema)
 *      - Claude recibe últimos N mensajes vía parámetro 'messages'
 *      - Mantiene coherencia conversacional completa
 *      - Esta es la VERDADERA memoria del sistema
 *
 * Flujo completo:
 *   User Input → Verification (evalúa) → System Prompt (instruye) → Claude (responde con memoria)
 *                                                                        ↑
 *                                                          messages: [...últimos N mensajes]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const AI_CONFIG = {
  /**
   * MODELOS DE ANTHROPIC
   *
   * Sophia usa un mix de modelos de ANTHROPIC.
   *
   * Consideraciones:
   * - Sonnet 4.5: Balance óptimo entre calidad y costo
   * - Haiku: Opción más económica para futuro (verificación simple)
   * - Opus: Opción premium para casos que requieran máxima calidad
   *
   * IMPORTANTE: Cambiar modelo afecta:
   * - Costo por request (input + output tokens)
   * - Latencia de respuesta
   * - Calidad de evaluación/respuesta
   */
  models: {
    /**
     * Modelo para chat streaming (respuestas principales del instructor)
     *
     * Usado en: app/api/chat/stream/route.ts
     * Contexto: Conversación principal con el estudiante
     * Input tokens típico: 2000-3000 (system prompt + historial + user message)
     * Output tokens típico: 500-1024
     */
    chat: 'claude-sonnet-4-5-20250929',

    /**
     * Modelo para verificación de actividades
     *
     * Usado en: lib/activity-verification.ts
     * Contexto: Evaluar si estudiante completó criterios (output JSON)
     * Input tokens típico: 300-500 (criteria + user message, SIN historial)
     * Output tokens típico: 150-300 (JSON estructurado)
     *
     * OPTIMIZACIÓN: Este modelo es candidato para downgrade a Haiku
     * ya que solo necesita evaluar criterios simples (no creatividad).
     */
    // verification: 'claude-sonnet-4-5-20250929',
    verification: 'claude-haiku-4-5-20251001',

    /**
     * Modelo para mensaje de bienvenida
     *
     * Usado en: app/api/chat/welcome/route.ts
     * Contexto: Primera interacción al iniciar lección
     * Input tokens típico: 800-1200 (full system prompt con pedagogía)
     * Output tokens típico: 200-512
     */
    // welcome: 'claude-sonnet-4-5-20250929',
    welcome: 'claude-haiku-4-5-20251001',
  },

  /**
   * LÍMITES DE TOKENS (max_tokens)
   *
   * Controla la longitud máxima de las respuestas de Claude.
   *
   * Trade-offs:
   * - Más tokens = Respuestas más completas pero más costo y latencia
   * - Menos tokens = Respuestas concisas pero riesgo de corte abrupto
   *
   * IMPACTO EN COSTOS:
   * Estos valores son multiplicadores directos del costo. Cada token de
   * output es ~4x más caro que input en Sonnet 4.5.
   */
  tokens: {
    /**
     * Max tokens para respuestas de chat
     *
     * Valor actual: 1024 tokens (~750-800 palabras en español)
     *
     * Contexto: Respuestas conversacionales del instructor
     * Guía en prompt: "máximo 3-4 párrafos"
     *
     * Ajuste recomendado:
     * - 512: Respuestas muy concisas (2 párrafos)
     * - 1024: Balance actual (3-4 párrafos) ✅
     * - 2048: Respuestas largas (explicaciones detalladas)
     */
    chat: 1024,

    /**
     * Max tokens para verificación de actividades
     *
     * Valor actual: 500 tokens
     *
     * Contexto: Output JSON estructurado (completed, criteriaMatched, feedback)
     * Típicamente usa: 150-300 tokens reales
     *
     * Este valor es generoso para garantizar que el JSON completo
     * siempre se genere correctamente sin corte.
     */
    verification: 500,

    /**
     * Max tokens para mensaje de bienvenida
     *
     * Valor actual: 512 tokens (~380-400 palabras)
     *
     * Contexto: Primera interacción, establece tono y engagement
     * Mayor que chat normal porque:
     * - Debe ser más cálido y atractivo
     * - Incluye introducción al tema
     * - Hace pregunta de engagement inicial
     */
    welcome: 512,
  },

  /**
   * RATE LIMITING
   *
   * Protección anti-spam y control de costos por usuario.
   *
   * Implementado con sliding window en memoria (Map).
   * Ver: lib/rate-limit.ts
   */
  rateLimit: {
    /**
     * Mensajes permitidos por ventana de tiempo
     *
     * Valor actual: 10 mensajes
     *
     * Balance:
     * - Muy bajo (<5): Frustra usuarios legítimos en conversación fluida
     * - Balance (10): Permite conversación natural, previene spam ✅
     * - Muy alto (>20): No previene abuso efectivamente
     *
     * IMPORTANTE: En producción, este límite protege contra:
     * - Usuarios maliciosos (ataques de costo)
     * - Bugs de frontend (loops infinitos)
     * - Uso accidental excesivo
     */
    messagesPerMinute: 10,

    /**
     * Ventana de tiempo para rate limiting
     *
     * Valor actual: 60 segundos (1 minuto)
     *
     * Se usa sliding window, no fixed window.
     * Ejemplo: Si envías 10 mensajes en 30s, debes esperar 30s más
     * (no esperar al minuto completo).
     */
    windowSeconds: 60,

    /**
     * Intervalo de limpieza de rate limit cache
     *
     * Valor actual: 5 minutos (300000 ms)
     *
     * Limpia entradas expiradas del Map en memoria para prevenir
     * memory leaks en instancias de larga duración.
     *
     * No afecta UX, solo mantenimiento interno.
     */
    cleanupIntervalMs: 5 * 60 * 1000,
  },

  /**
   * HISTORIAL CONVERSACIONAL
   *
   * CRÍTICO: Esta es la configuración que define la "memoria" del sistema.
   *
   * ARQUITECTURA:
   * - Prompts (verification + system): NO incluyen historial (optimización)
   * - Messages array: SÍ incluye historial (memoria real de Claude)
   *
   * Claude ve los últimos N mensajes completos en el contexto.
   */
  history: {
    /**
     * Mensajes incluidos en el contexto de chat
     *
     * Valor actual: 10 mensajes (5 pares usuario-asistente)
     *
     * Usado en: app/api/chat/stream/route.ts
     *
     * Se obtienen de DB con:
     *   prisma.message.findMany({ take: 10, orderBy: { timestamp: 'desc' } })
     *
     * Trade-offs:
     * - Más mensajes:
     *   ✅ Mejor coherencia en conversaciones largas
     *   ✅ Claude recuerda contexto anterior
     *   ❌ Más input tokens = más costo
     *   ❌ Mayor latencia
     *
     * - Menos mensajes:
     *   ✅ Menor costo y latencia
     *   ❌ Pierde coherencia si conversación es larga
     *   ❌ Usuario debe repetir contexto
     *
     * Benchmarks:
     * - 5 mensajes: Conversaciones muy cortas (2-3 intercambios)
     * - 10 mensajes: Balance óptimo (5 intercambios) ✅
     * - 20 mensajes: Conversaciones complejas (mucho contexto)
     *
     * ESTIMACIÓN DE TOKENS:
     * 10 mensajes ≈ 1000-1500 input tokens adicionales
     * 6 mensajes ≈ 600-900 input tokens adicionales
     */
    chatContext: 6,

    /**
     * Mensajes en contexto de verificación
     *
     * Valor actual: 0 (historial ELIMINADO en optimización)
     *
     * CAMBIO RECIENTE (2025-01-11):
     * Antes: 5 mensajes incluidos en verification prompt
     * Ahora: 0 mensajes (eliminado completamente)
     *
     * Razón: Optimización de tokens (~200-500 tokens ahorrados por verificación)
     *
     * Impacto:
     * ✅ 95% de casos: Sin impacto (respuestas autónomas)
     * ⚠️ 5% de casos: Menor precisión en referencias contextuales
     *    Ejemplo: "lo que mencionaste antes" sin contexto explícito
     *
     * MEMORIA DEL SISTEMA:
     * Aunque verification no tiene historial, Claude SÍ lo tiene vía
     * messages array, por lo que la conversación mantiene coherencia.
     */
    verificationContext: 0,
  },

  /**
   * SISTEMA DE HINTS PROGRESIVOS
   *
   * Ayuda adaptativa basada en intentos fallidos del estudiante.
   *
   * Filosofía pedagógica:
   * - No dar respuesta directa inmediatamente (método socrático)
   * - Ofrecer hints progresivamente según dificultad
   * - Balance entre challenge y frustración
   */
  hints: {
    /**
     * Intentos mínimos antes de mostrar primer hint
     *
     * Valor actual: 2 intentos
     *
     * Progresión:
     * - Intento 1: Sin hint (estudiante debe intentar solo)
     * - Intento 2: Sin hint (segunda oportunidad)
     * - Intento 3+: Comienzan hints progresivos
     *
     * Usado en: lib/prompt-builder.ts
     */
    minAttempts: 2,

    /**
     * Frecuencia de nuevos hints (cada N intentos)
     *
     * Valor actual: 2 intentos
     *
     * Progresión de hints:
     * - Intento 2: Hint 0 (primer hint, más sutil)
     * - Intento 4: Hint 1 (segundo hint, más directo)
     * - Intento 6: Hint 2 (tercer hint, casi explícito)
     *
     * Fórmula: hintIndex = Math.floor(attempts / frequency) - 1
     *
     * Usado en:
     * - lib/prompt-builder.ts (mostrar en system prompt)
     * - lib/activity-verification.ts (determinar si mostrar)
     */
    frequency: 2,
  },

  /**
   * TIMEOUTS Y DURACIONES
   *
   * Límites de tiempo para prevenir timeouts en Vercel y mala UX.
   */
  timeouts: {
    /**
     * Timeout máximo para API routes (Vercel)
     *
     * Valor actual: 60 segundos
     *
     * Límites de Vercel:
     * - Hobby plan: 10 segundos (muy restrictivo)
     * - Pro plan: 60 segundos ✅
     * - Enterprise: 900 segundos (15 min)
     *
     * IMPORTANTE: Streaming permite respuestas largas sin timeout
     * porque el connection se mantiene abierta con chunks incrementales.
     *
     * ⚠️ LIMITACIÓN TÉCNICA:
     * Next.js requiere que `export const maxDuration` sea un valor literal,
     * NO puede ser una expresión runtime. Por lo tanto, este valor está
     * duplicado como literal en app/api/chat/stream/route.ts:18
     *
     * Si cambias este valor, DEBES actualizar manualmente el literal.
     *
     * Usado en:
     * - app/api/chat/stream/route.ts (línea 18, duplicado como literal)
     */
    vercelMaxDuration: 60,
  },

  /**
   * POLLING Y ACTUALIZACIONES DE UI
   *
   * Frecuencia con la que el frontend consulta el backend por actualizaciones.
   *
   * Trade-offs:
   * - Polling rápido (<3s): Más reactivo pero más requests al servidor
   * - Polling lento (>10s): Menos overhead pero UX menos fluida
   */
  polling: {
    /**
     * Intervalo de polling para barra de progreso
     *
     * Valor actual: 3000 ms (3 segundos)
     *
     * Contexto: Actualización de barra de progreso en header y chat
     *
     * Usado en:
     * - components/learning/activity-progress-header.tsx
     * - components/learning/chat-interface.tsx
     *
     * NOTA: Con arquitectura actual, el progreso se actualiza
     * instantáneamente vía SSE events (activity_completed).
     * Este polling es FALLBACK por si el evento SSE falla.
     *
     * TODO: Considerar eliminar polling y confiar 100% en SSE events.
     */
    progressIntervalMs: 3000,
  },

  /**
   * CONFIGURACIONES ADICIONALES (menos críticas)
   */
  fallback: {
    /**
     * Longitud mínima de keywords en verificación fallback
     *
     * Valor actual: 4 caracteres
     *
     * Usado en: lib/activity-verification.ts
     *
     * Contexto: Si la IA falla, se hace verificación simple por keywords.
     * Solo considera palabras con más de N caracteres para evitar
     * falsos positivos con palabras comunes ("es", "un", "el").
     *
     * Este fallback rara vez se usa (solo si Anthropic API falla).
     */
    keywordMinLength: 4,
  },
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIPO EXPORTADO (para TypeScript)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export type AIConfig = typeof AI_CONFIG

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHANGELOG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 2025-01-11: Creación del archivo ai-config.ts
 *   - Centralizar todas las configuraciones AI hardcodeadas
 *   - Eliminar historial de verification prompt (optimización de tokens)
 *   - Documentar arquitectura de memoria del sistema
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
