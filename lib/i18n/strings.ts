/**
 * Strings traducidas ES/EN para el flujo del kiosko (/eval/[code]) y survey.
 * Single source of truth — todas las UI strings que ven los visitantes pasan
 * por acá. Si agregás algo nuevo en la UI, agregá la key en ambos idiomas.
 *
 * Por qué un Map plano y no next-intl / react-intl: ~80 strings totales,
 * un objeto literal es más simple, sin overhead de runtime ni configuración.
 * Si esto crece >200 strings o necesitamos pluralización compleja, migrar.
 */

export type Locale = 'ES' | 'EN'

export const STRINGS = {
  ES: {
    // Toggle de idioma en registro
    language_switch_aria: 'Cambiar idioma',
    language_es: 'ES',
    language_en: 'EN',

    // Pantalla de registro (kiosko)
    register_title: 'Bienvenido',
    register_subtitle: 'Comparte tus datos para empezar',
    register_first_name: 'Nombre',
    register_last_name: 'Apellido',
    register_last_name_optional: '(opcional)',
    register_dni: 'DNI',
    register_email: 'Email',
    register_email_optional: '(opcional)',
    register_start: 'Comenzar',
    register_starting: 'Iniciando...',
    register_error_generic: 'No se pudo iniciar. Intenta de nuevo.',
    register_error_missing_name: 'Ingresa tu nombre',

    // Pantalla de sesión
    session_participant: 'Participante',
    session_exit: 'Salir',
    session_exit_confirm: '¿Querés salir de la clase?',
    session_objective_label: 'Aprendizaje Esperado',
    session_key_points_label: 'Puntos Clave',
    session_progress_label: 'Progreso',
    session_activity_of: 'Actividad {current} de {total}',
    session_writing_hint: '📱 En móvil te recomendamos usar Escribir para mejor experiencia',
    session_write_button: 'Escribir',
    session_hide_button: 'Ocultar',
    session_resources_label: 'Recursos',
    session_no_resources: 'Sin recursos para esta actividad',
    session_image_counter: 'Imagen {current} de {total}',
    session_view_conversation: 'Ver conversación',
    session_messages: 'mensajes',
    session_message: 'mensaje',
    session_preparing: 'Sophia se está preparando...',
    session_thinking: 'Sophia está pensando...',
    session_speaking: 'Sophia está hablando...',
    voice_activate: 'Activar voz',
    voice_connecting: 'Conectando...',
    voice_click_to_speak: 'Click para hablar',
    voice_click_to_send: 'Click para enviar',
    voice_restart: 'Reiniciar',

    // Pantalla de resultado
    result_title: 'Gracias por participar',
    result_grade_label: 'Tu nota',
    result_level_label: 'Tu nivel',
    result_passed: 'Aprobado',
    result_not_passed: 'En proceso',
    result_finish: 'Salir',
    rubric_inicio: 'Inicio',
    rubric_proceso: 'Proceso',
    rubric_logrado: 'Logrado',
    rubric_destacado: 'Destacado',
    rubric_inicio_desc: 'Necesitas reforzar los conceptos básicos',
    rubric_proceso_desc: 'Vas por buen camino, sigue practicando',
    rubric_logrado_desc: 'Dominás los conceptos enseñados',
    rubric_destacado_desc: 'Excelente — comprensión profunda del tema',

    // Survey modal
    survey_title: 'Tu opinión nos ayuda a mejorar',
    survey_description: 'Toma 30 segundos. Puedes saltarla si prefieres.',
    survey_q1: '¿Qué tan probable es que recomiendes estudiar con Sophia a un compañero?',
    survey_nps_low: 'Nada probable',
    survey_nps_high: 'Muy probable',
    survey_q2: '¿Por qué le pusiste esa nota?',
    survey_q2_placeholder: 'Cuéntanos en una frase...',
    survey_optional: '(opcional)',
    survey_q3: '¿Qué tan útil te resultó lo aprendido?',
    survey_utility_very: 'Muy útil — voy a usarlo',
    survey_utility_useful: 'Útil — algo me va a servir',
    survey_utility_low: 'Poco útil — no sé cuándo lo usaré',
    survey_utility_not: 'Nada útil — no me sirve',
    survey_submit: 'Enviar',
    survey_sending: 'Enviando...',
    survey_later: 'Más tarde →',
    survey_thanks: '¡Gracias por tu opinión!',
    survey_error: 'No se pudo enviar',
  },
  EN: {
    // Language toggle in registration
    language_switch_aria: 'Change language',
    language_es: 'ES',
    language_en: 'EN',

    // Registration screen (kiosko)
    register_title: 'Welcome',
    register_subtitle: 'Share your info to get started',
    register_first_name: 'First name',
    register_last_name: 'Last name',
    register_last_name_optional: '(optional)',
    register_dni: 'ID number',
    register_email: 'Email',
    register_email_optional: '(optional)',
    register_start: 'Start',
    register_starting: 'Starting...',
    register_error_generic: 'Could not start. Please try again.',
    register_error_missing_name: 'Please enter your name',

    // Session screen
    session_participant: 'Participant',
    session_exit: 'Exit',
    session_exit_confirm: 'Do you want to exit the class?',
    session_objective_label: 'Learning Goal',
    session_key_points_label: 'Key Points',
    session_progress_label: 'Progress',
    session_activity_of: 'Activity {current} of {total}',
    session_writing_hint: '📱 On mobile we recommend using Write for a better experience',
    session_write_button: 'Write',
    session_hide_button: 'Hide',
    session_resources_label: 'Resources',
    session_no_resources: 'No resources for this activity',
    session_image_counter: 'Image {current} of {total}',
    session_view_conversation: 'View conversation',
    session_messages: 'messages',
    session_message: 'message',
    session_preparing: 'Sophia is getting ready...',
    session_thinking: 'Sophia is thinking...',
    session_speaking: 'Sophia is speaking...',
    voice_activate: 'Activate voice',
    voice_connecting: 'Connecting...',
    voice_click_to_speak: 'Click to speak',
    voice_click_to_send: 'Click to send',
    voice_restart: 'Restart',

    // Result screen
    result_title: 'Thanks for participating',
    result_grade_label: 'Your score',
    result_level_label: 'Your level',
    result_passed: 'Passed',
    result_not_passed: 'In progress',
    result_finish: 'Exit',
    rubric_inicio: 'Beginning',
    rubric_proceso: 'In progress',
    rubric_logrado: 'Achieved',
    rubric_destacado: 'Outstanding',
    rubric_inicio_desc: 'You need to reinforce the basic concepts',
    rubric_proceso_desc: "You're on the right track, keep practicing",
    rubric_logrado_desc: 'You master the concepts taught',
    rubric_destacado_desc: 'Excellent — deep understanding of the topic',

    // Survey modal
    survey_title: 'Your feedback helps us improve',
    survey_description: 'Takes 30 seconds. You can skip if you prefer.',
    survey_q1: 'How likely are you to recommend studying with Sophia to a colleague?',
    survey_nps_low: 'Not likely',
    survey_nps_high: 'Very likely',
    survey_q2: 'Why this score?',
    survey_q2_placeholder: 'Tell us in a sentence...',
    survey_optional: '(optional)',
    survey_q3: 'How useful was what you learned?',
    survey_utility_very: 'Very useful — I will use it',
    survey_utility_useful: 'Useful — some of it will help',
    survey_utility_low: "Slightly useful — not sure when I'd use it",
    survey_utility_not: "Not useful — it doesn't help me",
    survey_submit: 'Send',
    survey_sending: 'Sending...',
    survey_later: 'Later →',
    survey_thanks: 'Thanks for your feedback!',
    survey_error: 'Could not send',
  },
} as const

export type StringKey = keyof typeof STRINGS['ES']

/**
 * Traductor con interpolación de variables tipo {var}.
 * Ejemplo: t('session_activity_of', { current: 3, total: 5 })
 */
export function t(
  locale: Locale,
  key: StringKey,
  vars?: Record<string, string | number>
): string {
  const template = STRINGS[locale][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}
