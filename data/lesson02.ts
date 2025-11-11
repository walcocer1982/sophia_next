/**
 * Lección hardcodeada de Prompt Engineering Básico para desarrollo
 * Permite hacer cambios rápidos sin modificar la DB
 *
 * Activar con: ALLOW_HARDCODE_LESSON=1 en .env
 */

import type { LessonContent } from '@/types/lesson'

export const hardcodedLesson: LessonContent & { id: string } = {
  id: 'lesson-prompt-eng-01', // ID fijo para matching con LessonSession
  lesson: {
    title: 'Prompt Engineering - Básico',
    description: 'Aprende a escribir prompts efectivos para obtener mejores respuestas de modelos de IA como ChatGPT y Claude',
    duration_minutes: 40,
  },
  moments: [
    {
      id: 'prompt_moment_001',
      title: 'Fundamentos de Prompt Engineering',
      activities: [
        {
          id: 'prompt_activity_001',
          type: 'explanation',
          teaching: {
            main_topic: '¿Qué es Prompt Engineering y por qué es importante?',
            key_points: [
              'Prompt Engineering es el arte y ciencia de diseñar instrucciones efectivas para modelos de IA',
              'Un prompt bien diseñado obtiene respuestas más precisas, útiles y relevantes',
              'Los modelos de IA interpretan literalmente lo que escribimos',
              'Pequeños cambios en el prompt pueden generar resultados muy diferentes',
              'Es una habilidad fundamental en la era de la IA generativa'
            ],
            approach: 'conversational',
          },
          verification: {
            question: '¿Qué es Prompt Engineering y por qué es importante cuando trabajamos con modelos de IA?',
            criteria: [
              'Define Prompt Engineering como el diseño de instrucciones para IA',
              'Menciona que ayuda a obtener mejores respuestas',
              'Indica que los modelos interpretan literalmente las instrucciones',
            ],
            target_length: 'medium',
            hints: [
              'Piensa en un prompt como una receta: mientras más clara y específica, mejor el resultado',
              'Prompt Engineering es como aprender el "lenguaje" que los modelos de IA entienden mejor'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
        },
        {
          id: 'prompt_activity_002',
          type: 'explanation',
          teaching: {
            main_topic: 'Componentes clave de un prompt efectivo',
            key_points: [
              'Contexto: Información de fondo que ayuda al modelo a entender la situación',
              'Rol: Define quién quieres que sea la IA (experto, profesor, analista, etc.)',
              'Tarea: Instrucción clara y específica de qué debe hacer',
              'Formato: Cómo quieres la respuesta (lista, párrafo, tabla, código, etc.)',
              'Restricciones: Límites o reglas que debe seguir'
            ],
            approach: 'conversational',
          },
          verification: {
            question: 'Menciona los 5 componentes clave de un prompt efectivo y da un ejemplo breve de cada uno',
            criteria: [
              'Menciona Contexto con ejemplo relevante',
              'Menciona Rol con ejemplo',
              'Menciona Tarea con ejemplo',
              'Menciona Formato con ejemplo',
              'Menciona Restricciones con ejemplo'
            ],
            target_length: 'long',
            hints: [
              'Contexto es el "setting" o escenario, Rol es quién debe actuar la IA',
              'Tarea es el QUÉ hacer, Formato es el CÓMO presentarlo, Restricciones son los límites'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
          guardrails: [
            {
              trigger: 'student_asks_about_advanced_techniques',
              response: 'Excelentes preguntas sobre técnicas avanzadas. Primero dominemos los fundamentos y luego exploraremos esas técnicas más adelante.',
            }
          ],
        },
        {
          id: 'prompt_activity_003',
          type: 'practice',
          teaching: {
            main_topic: 'Crear tu primer prompt estructurado',
            key_points: [
              'Comienza definiendo el contexto claramente',
              'Asigna un rol específico a la IA',
              'Da una instrucción clara y accionable',
              'Especifica el formato deseado',
              'Agrega restricciones si son necesarias'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Escribe un prompt completo para pedir a una IA que te ayude a escribir un email de agradecimiento a un profesor. Debe incluir: contexto, rol, tarea específica, formato y al menos una restricción',
            criteria: [
              'Proporciona contexto sobre la situación (por qué agradece)',
              'Define un rol para la IA (ej: asistente de redacción, experto en comunicación)',
              'Especifica la tarea clara (escribir email de agradecimiento)',
              'Indica formato deseado (formal/informal, longitud, estructura)',
              'Incluye al menos una restricción (ej: máximo 3 párrafos, tono específico)'
            ],
            target_length: 'long',
            hints: [
              'Empieza con "Eres un..." para definir el rol',
              'Incluye detalles como: qué clase es, qué aprendi��, por qué agradeces',
              'Especifica si quieres un tono formal o casual'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 3,
          },
        }
      ],
    },
    {
      id: 'prompt_moment_002',
      title: 'Técnicas Avanzadas',
      activities: [
        {
          id: 'prompt_activity_004',
          type: 'explanation',
          teaching: {
            main_topic: 'Técnica de Few-Shot Learning: Enseñar con ejemplos',
            key_points: [
              'Few-shot learning es proporcionar ejemplos de entrada-salida deseada',
              'Ayuda al modelo a entender el patrón o estilo que buscas',
              '2-3 ejemplos suelen ser suficientes para guiar la respuesta',
              'Los ejemplos deben ser diversos pero consistentes en formato',
              'Es especialmente útil para tareas de clasificación o transformación de texto'
            ],
            approach: 'conversational',
          },
          verification: {
            question: '¿Qué es Few-Shot Learning en prompts y cuándo es útil? Da un ejemplo de cómo lo usarías',
            criteria: [
              'Define Few-Shot Learning como dar ejemplos al modelo',
              'Menciona que ayuda al modelo a entender el patrón deseado',
              'Indica cuántos ejemplos suelen ser suficientes (2-3)',
              'Da un ejemplo concreto de uso (clasificación, formato, etc.)',
            ],
            target_length: 'medium',
            hints: [
              'Piensa en Few-Shot como "enseñar mostrando" en lugar de solo explicar',
              'Es útil cuando quieres un formato específico o estilo particular de respuesta'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
        },
        {
          id: 'prompt_activity_005',
          type: 'practice',
          teaching: {
            main_topic: 'Proyecto: Prompt para caso real con Few-Shot',
            key_points: [
              'Combina todos los componentes aprendidos',
              'Incluye contexto, rol, tarea, formato y restricciones',
              'Usa Few-Shot (2-3 ejemplos) para guiar la respuesta',
              'Los ejemplos deben ser claros y representativos',
              'Verifica que el prompt sea reproducible'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Crea un prompt completo que use Few-Shot Learning para enseñar a una IA a clasificar comentarios de productos como "Positivo", "Neutral" o "Negativo". Debe incluir: rol, contexto, tarea, 3 ejemplos, y el formato de salida deseado',
            criteria: [
              'Define rol para la IA (ej: analista de sentimientos)',
              'Proporciona contexto sobre la tarea de clasificación',
              'Incluye exactamente 3 ejemplos con formato: comentario → clasificación',
              'Los ejemplos cubren las 3 categorías (Positivo, Neutral, Negativo)',
              'Especifica claramente el formato de salida esperado',
              'Incluye la nueva entrada a clasificar al final'
            ],
            target_length: 'long',
            hints: [
              'Estructura: Rol → Contexto → Ejemplos (Input: "..." → Output: "...") → Nueva entrada',
              'Los ejemplos deben ser variados: 1 positivo, 1 neutral, 1 negativo',
              'Termina con "Ahora clasifica este comentario: [nuevo comentario]"'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 4,
          },
          guardrails: [
            {
              trigger: 'student_asks_about_other_techniques',
              response: 'Hay muchas técnicas avanzadas (Chain-of-Thought, Self-Consistency, etc.). Primero domina Few-Shot y luego podrás explorar esas técnicas en lecciones futuras.',
            }
          ],
        }
      ],
    }
  ],
}

export default hardcodedLesson
