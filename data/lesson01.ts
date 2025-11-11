/**
 * Lección hardcodeada de HTML Básico para desarrollo
 * Permite hacer cambios rápidos sin modificar la DB
 *
 * Activar con: ALLOW_HARDCODE_LESSON=1 en .env
 */

import type { LessonContent } from '@/types/lesson'

export const hardcodedLesson: LessonContent & { id: string } = {
  id: 'lesson-html-01', // ID fijo para matching con LessonSession
  lesson: {
    title: 'HTML Básico - Crea tu Primera Página Web',
    description: 'Aprende los fundamentos de HTML y crea tu primera página web desde cero',
    duration_minutes: 45,
  },
  moments: [
    {
      id: 'html_moment_001',
      title: 'Introducción a HTML',
      activities: [
        {
          id: 'html_activity_001',
          type: 'explanation',
          teaching: {
            main_topic: '¿Qué es HTML y para qué sirve?',
            key_points: [
              'HTML significa HyperText Markup Language (Lenguaje de Marcado de Hipertexto)',
              'Es el lenguaje estándar para crear páginas web',
              'HTML describe la estructura y contenido de una página web',
              'Usa etiquetas (tags) para definir elementos como títulos, párrafos, enlaces e imágenes',
              'Los navegadores interpretan HTML para mostrar las páginas web'
            ],
            approach: 'conversational',
          },
          verification: {
            question: '¿Qué significa HTML y cuál es su función principal al crear páginas web?',
            criteria: [
              'Menciona que HTML significa HyperText Markup Language o Lenguaje de Marcado',
              'Indica que sirve para crear la estructura de páginas web',
              'Menciona el uso de etiquetas o tags'
            ],
            target_length: 'medium',
            hints: [
              'Piensa en HTML como el esqueleto o estructura de una página web',
              'HTML no es un lenguaje de programación, es un lenguaje de marcado'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
        },
        {
          id: 'html_activity_002',
          type: 'explanation',
          teaching: {
            main_topic: 'Estructura básica de un documento HTML',
            key_points: [
              'Todo documento HTML comienza con <!DOCTYPE html>',
              'El elemento <html> es la raíz del documento',
              'El <head> contiene metadatos (título, estilos, scripts)',
              'El <body> contiene el contenido visible de la página',
              'Las etiquetas se abren <tag> y se cierran </tag>'
            ],
            approach: 'conversational',
          },
          verification: {
            question: 'Describe la estructura básica que debe tener todo documento HTML, mencionando las 4 partes esenciales',
            criteria: [
              'Menciona <!DOCTYPE html>',
              'Menciona la etiqueta <html>',
              'Menciona la etiqueta <head>',
              'Menciona la etiqueta <body>',
              'Explica brevemente para qué sirve cada una'
            ],
            target_length: 'medium',
            hints: [
              'El DOCTYPE va al principio y no es una etiqueta HTML',
              'Head es la cabeza (información) y body es el cuerpo (contenido visible)'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
          guardrails: [
            {
              trigger: 'student_mentions_css_or_javascript',
              response: 'CSS y JavaScript son importantes, pero primero enfoquémonos en entender bien HTML. Los veremos en lecciones futuras.',
            }
          ],
        },
        {
          id: 'html_activity_003',
          type: 'practice',
          teaching: {
            main_topic: 'Crear tu primera página HTML',
            key_points: [
              'Escribir la estructura básica completa',
              'Agregar un título en el <head> con <title>',
              'Crear un encabezado principal con <h1>',
              'Escribir párrafos con <p>',
              'Todas las etiquetas deben estar correctamente cerradas'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Escribe el código HTML completo para una página que tenga: DOCTYPE, estructura básica (html, head, body), un título de página "Mi Primera Web", un encabezado h1 que diga "Hola Mundo" y un párrafo con cualquier texto',
            criteria: [
              'Incluye <!DOCTYPE html>',
              'Tiene estructura completa con <html>, <head> y <body>',
              'Incluye <title>Mi Primera Web</title> en el head',
              'Tiene un <h1>Hola Mundo</h1> en el body',
              'Incluye al menos un párrafo <p> con contenido',
              'Todas las etiquetas están correctamente cerradas'
            ],
            target_length: 'long',
            hints: [
              'Recuerda que <title> va dentro de <head>',
              'El contenido visible (h1 y p) va dentro de <body>',
              'No olvides cerrar todas las etiquetas en el orden correcto'
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
      id: 'html_moment_002',
      title: 'Elementos HTML Esenciales',
      activities: [
        {
          id: 'html_activity_004',
          type: 'explanation',
          teaching: {
            main_topic: 'Etiquetas de texto y encabezados',
            key_points: [
              'Los encabezados van de <h1> a <h6>, siendo h1 el más importante',
              'Los párrafos se crean con <p>',
              '<strong> para texto en negrita con importancia',
              '<em> para texto en cursiva con énfasis',
              '<br> para saltos de línea (etiqueta auto-cerrada)'
            ],
            approach: 'conversational',
          },
          verification: {
            question: '¿Cuáles son las diferencias entre h1, h2 y h6? ¿Y cuándo usarías <strong> en lugar de <b>?',
            criteria: [
              'Explica que h1 es el más importante/grande y h6 el menos',
              'Menciona la jerarquía de encabezados',
              'Indica que <strong> tiene significado semántico (importancia)',
              'Opcionalmente menciona que <b> es solo visual'
            ],
            target_length: 'medium',
            hints: [
              'Los números en h1-h6 indican nivel de importancia, no solo tamaño',
              '<strong> le dice a los lectores de pantalla que el texto es importante'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
        },
        {
          id: 'html_activity_005',
          type: 'practice',
          teaching: {
            main_topic: 'Trabajar con enlaces e imágenes',
            key_points: [
              'Los enlaces se crean con <a href="url">texto</a>',
              'Las imágenes con <img src="url" alt="descripción">',
              'El atributo alt es importante para accesibilidad',
              'Los enlaces pueden ser externos (http://) o internos (#seccion)',
              '<img> es una etiqueta auto-cerrada (no necesita </img>)'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Crea el código HTML para: 1) Un enlace a Google que diga "Buscar en Google", 2) Una imagen con src="logo.jpg" y un texto alternativo apropiado',
            criteria: [
              'Enlace usa <a href="https://google.com">',
              'El texto del enlace es "Buscar en Google"',
              'La imagen usa <img src="logo.jpg">',
              'Incluye atributo alt con descripción relevante',
              'Sintaxis correcta (comillas, cierre de tags si aplica)'
            ],
            target_length: 'medium',
            hints: [
              'El atributo href va dentro de la etiqueta de apertura <a>',
              'La etiqueta <img> no se cierra como </img>, es auto-cerrada',
              'El alt describe la imagen para personas que no pueden verla'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 3,
          },
        },
        {
          id: 'html_activity_006',
          type: 'practice',
          teaching: {
            main_topic: 'Listas en HTML',
            key_points: [
              'Listas ordenadas <ol> para elementos numerados',
              'Listas no ordenadas <ul> para elementos con viñetas',
              'Los elementos de lista se definen con <li>',
              'Las listas se pueden anidar unas dentro de otras',
              'Cada <li> debe estar dentro de <ol> o <ul>'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Crea una lista no ordenada de 3 frutas y una lista ordenada con 3 pasos para hacer un sándwich',
            criteria: [
              'Usa <ul> para la lista de frutas',
              'Usa <ol> para los pasos del s�ndwich',
              'Cada elemento está en su propio <li>',
              'Tiene 3 frutas y 3 pasos',
              'Las etiquetas están correctamente anidadas y cerradas'
            ],
            target_length: 'long',
            hints: [
              '<ul> significa "unordered list" y <ol> significa "ordered list"',
              'Cada <li> debe estar directamente dentro de <ul> o <ol>',
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 2,
          },
        }
      ],
    },
    {
      id: 'html_moment_003',
      title: 'Proyecto Final',
      activities: [
        {
          id: 'html_activity_007',
          type: 'practice',
          teaching: {
            main_topic: 'Crear una página personal completa',
            key_points: [
              'Combinar todos los elementos aprendidos',
              'Estructura correcta del documento',
              'Uso apropiado de encabezados para jerarquía',
              'Incluir texto, enlaces e imágenes',
              'Crear al menos una lista'
            ],
            approach: 'practical',
          },
          verification: {
            question: 'Crea una página HTML completa sobre ti (o un personaje ficticio) que incluya: estructura básica, un h1 con tu nombre, un párrafo de presentación, una lista de 3 hobbies, y un enlace a tu sitio favorito',
            criteria: [
              'Estructura completa con DOCTYPE, html, head, body',
              'Incluye <title> relevante en el head',
              'Tiene h1 con un nombre',
              'Incluye párrafo de presentación',
              'Tiene lista (ul o ol) con 3 hobbies',
              'Incluye al menos un enlace externo',
              'Código bien formateado y etiquetas cerradas'
            ],
            target_length: 'long',
            hints: [
              'Empieza con la estructura b�sica y ve agregando elementos',
              'Puedes usar <ul> o <ol> para la lista de hobbies',
              'No olvides el DOCTYPE y el title en el head'
            ],
          },
          student_questions: {
            approach: 'answer_then_redirect',
            max_tangent_responses: 4,
          },
          guardrails: [
            {
              trigger: 'student_tries_advanced_features',
              response: 'Excelente que quieras explorar más, pero primero asegurémonos de dominar los fundamentos. Podremos ver características avanzadas en próximas lecciones.',
            }
          ],
        }
      ],
    }
  ],
}

export default hardcodedLesson