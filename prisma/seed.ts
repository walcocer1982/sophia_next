/**
 * Seed script para Sophia Next
 * Estructura actualizada: 2025-01-20
 *
 * Ejecutar: npx prisma db seed
 * O directamente: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ============================================
  // 1. CREAR USUARIOS DE PRUEBA
  // ============================================
  const testUser = await prisma.user.upsert({
    where: { email: 'test@sophia.dev' },
    update: {
      name: 'Usuario de Prueba',
    },
    create: {
      id: '1000',
      email: 'test@sophia.dev',
      name: 'Usuario de Prueba',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Usuario de prueba creado:', testUser.email)

  // ============================================
  // 2. CREAR CURSO
  // ============================================
  const course = await prisma.course.upsert({
    where: { slug: 'desarrollo-web-basico' },
    update: {
      instructor: `Eres un instructor de desarrollo web experto y paciente.
Tu nombre es Alex y tienes 10 años de experiencia enseñando programación.
Usas analogías simples y ejemplos del mundo real.
Hablas de manera conversacional, como un mentor amigable.
Nunca usas emojis ni exclamaciones exageradas.`,
    },
    create: {
      title: 'Desarrollo Web Básico',
      slug: 'desarrollo-web-basico',
      instructor: `Eres un instructor de desarrollo web experto y paciente.
Tu nombre es Alex y tienes 10 años de experiencia enseñando programación.
Usas analogías simples y ejemplos del mundo real.
Hablas de manera conversacional, como un mentor amigable.
Nunca usas emojis ni exclamaciones exageradas.`,
      isPublished: true,
    },
  })
  console.log('✅ Curso creado:', course.title)

  // ============================================
  // 3. CREAR LECCIÓN CON NUEVA ESTRUCTURA
  // ============================================
  const lesson = await prisma.lesson.upsert({
    where: { slug: 'html-basico' },
    update: {
      objective: 'Comprender qué es HTML y crear una página web básica con estructura correcta',
      keyPoints: [
        'HTML es un lenguaje de marcado, no de programación',
        'Las etiquetas definen la estructura del contenido',
        'Toda página tiene DOCTYPE, html, head y body',
        'Las etiquetas se abren y se cierran',
      ],
      contentJson: {
        activities: [
          {
            id: 'html_activity_001',
            type: 'explanation',
            complexity: 'simple',
            keyPointIndex: 0,
            teaching: {
              agent_instruction: 'Explica qué es HTML y para qué sirve. Enfatiza que es un lenguaje de MARCADO (como poner etiquetas a cajas) y no de programación. Usa la analogía de un documento Word donde HTML sería como marcar "esto es título", "esto es párrafo". Pregunta si tiene experiencia previa con páginas web.',
              target_length: '150-250 palabras',
              context: 'Primera exposición al concepto. El estudiante no tiene conocimientos previos.',
            },
            verification: {
              question: '¿Qué es HTML y cuál es su función principal en una página web?',
              success_criteria: {
                must_include: [
                  'Menciona que HTML es un lenguaje de marcado (markup)',
                  'Indica que sirve para estructurar o organizar contenido',
                  'Distingue entre HTML y lenguajes de programación',
                ],
                min_completeness: 60,
                understanding_level: 'understood',
              },
              max_attempts: 3,
            },
            commonMistakes: [
              'Confundir HTML con un lenguaje de programación',
              'Pensar que HTML es para diseño visual o estilos',
            ],
          },
          {
            id: 'html_activity_002',
            type: 'explanation',
            complexity: 'simple',
            keyPointIndex: 1,
            teaching: {
              agent_instruction: 'Explica cómo funcionan las etiquetas HTML. Usa ejemplos concretos: <p> para párrafos, <h1> para títulos. Muestra que se abren y cierran: <p>texto</p>. Menciona que hay etiquetas que no se cierran como <br> y <img>.',
              target_length: '150-250 palabras',
              context: 'El estudiante ya entiende qué es HTML, ahora aprende la sintaxis.',
            },
            verification: {
              question: '¿Cómo se escribe una etiqueta HTML correctamente? Dame un ejemplo.',
              success_criteria: {
                must_include: [
                  'Muestra sintaxis con < y > (angle brackets)',
                  'Indica que hay etiqueta de apertura y cierre',
                  'Proporciona al menos un ejemplo correcto',
                ],
                min_completeness: 60,
                understanding_level: 'understood',
              },
              max_attempts: 3,
            },
            commonMistakes: [
              'Olvidar cerrar etiquetas',
              'Confundir / de cierre con \\ (backslash)',
            ],
          },
          {
            id: 'html_activity_003',
            type: 'practice',
            complexity: 'moderate',
            keyPointIndex: 2,
            teaching: {
              agent_instruction: 'Guía al estudiante para crear su primera página HTML completa. Explica la estructura básica: DOCTYPE (declaración), html (raíz), head (metadata), body (contenido visible). Pide que escriba el código paso a paso.',
              target_length: '200-300 palabras',
              context: 'Ejercicio práctico. El estudiante debe escribir código real.',
            },
            verification: {
              question: 'Escribe el código HTML completo para una página con: DOCTYPE, estructura básica (html, head, body), un título "Mi Primera Web", un encabezado h1 que diga "Hola Mundo" y un párrafo con tu nombre.',
              success_criteria: {
                must_include: [
                  'Incluye <!DOCTYPE html>',
                  'Tiene estructura con <html>, <head> y <body>',
                  'Incluye <title> dentro de head',
                  'Tiene <h1> dentro de body',
                  'Incluye al menos un párrafo <p>',
                ],
                min_completeness: 70,
                understanding_level: 'applied',
              },
              max_attempts: 4,
            },
            commonMistakes: [
              'Poner title fuera de head',
              'Olvidar DOCTYPE',
              'No cerrar alguna etiqueta',
            ],
          },
          {
            id: 'html_activity_004',
            type: 'reflection',
            complexity: 'simple',
            keyPointIndex: 3,
            teaching: {
              agent_instruction: 'Haz que el estudiante reflexione sobre lo aprendido. Pregunta qué pasaría si no cerrara las etiquetas. Pide que piense en una analogía propia para explicar HTML a un amigo.',
              target_length: '100-200 palabras',
              context: 'Consolidación del aprendizaje.',
            },
            verification: {
              question: '¿Qué crees que pasaría si no cierras una etiqueta? ¿Cómo le explicarías HTML a un amigo que nunca ha programado?',
              success_criteria: {
                must_include: [
                  'Menciona que el navegador puede mostrar errores o contenido mal estructurado',
                  'Proporciona una analogía o explicación simple propia',
                ],
                min_completeness: 50,
                understanding_level: 'understood',
              },
              max_attempts: 2,
            },
          },
          {
            id: 'html_activity_005',
            type: 'closing',
            complexity: 'simple',
            keyPointIndex: 0,
            teaching: {
              agent_instruction: 'Resume los puntos clave de la lección: HTML es marcado no programación, etiquetas estructuran contenido, toda página tiene DOCTYPE/html/head/body. Felicita brevemente y sugiere siguiente paso: aprender más etiquetas o CSS.',
              target_length: '100-150 palabras',
              context: 'Cierre de lección.',
            },
            verification: {
              question: '¿Qué fue lo más importante que aprendiste hoy sobre HTML?',
              success_criteria: {
                must_include: [
                  'Menciona al menos un concepto clave aprendido',
                ],
                min_completeness: 40,
                understanding_level: 'memorized',
              },
              max_attempts: 1,
            },
          },
        ],
      },
    },
    create: {
      title: 'HTML Básico: Tu Primera Página Web',
      slug: 'html-basico',
      objective: 'Comprender qué es HTML y crear una página web básica con estructura correcta',
      keyPoints: [
        'HTML es un lenguaje de marcado, no de programación',
        'Las etiquetas definen la estructura del contenido',
        'Toda página tiene DOCTYPE, html, head y body',
        'Las etiquetas se abren y se cierran',
      ],
      order: 1,
      isPublished: true,
      courseId: course.id,
      contentJson: {
        activities: [
          {
            id: 'html_activity_001',
            type: 'explanation',
            complexity: 'simple',
            keyPointIndex: 0,
            teaching: {
              agent_instruction: 'Explica qué es HTML y para qué sirve. Enfatiza que es un lenguaje de MARCADO (como poner etiquetas a cajas) y no de programación. Usa la analogía de un documento Word donde HTML sería como marcar "esto es título", "esto es párrafo". Pregunta si tiene experiencia previa con páginas web.',
              target_length: '150-250 palabras',
              context: 'Primera exposición al concepto. El estudiante no tiene conocimientos previos.',
            },
            verification: {
              question: '¿Qué es HTML y cuál es su función principal en una página web?',
              success_criteria: {
                must_include: [
                  'Menciona que HTML es un lenguaje de marcado (markup)',
                  'Indica que sirve para estructurar o organizar contenido',
                  'Distingue entre HTML y lenguajes de programación',
                ],
                min_completeness: 60,
                understanding_level: 'understood',
              },
              max_attempts: 3,
            },
            commonMistakes: [
              'Confundir HTML con un lenguaje de programación',
              'Pensar que HTML es para diseño visual o estilos',
            ],
          },
          {
            id: 'html_activity_002',
            type: 'explanation',
            complexity: 'simple',
            keyPointIndex: 1,
            teaching: {
              agent_instruction: 'Explica cómo funcionan las etiquetas HTML. Usa ejemplos concretos: <p> para párrafos, <h1> para títulos. Muestra que se abren y cierran: <p>texto</p>. Menciona que hay etiquetas que no se cierran como <br> y <img>.',
              target_length: '150-250 palabras',
              context: 'El estudiante ya entiende qué es HTML, ahora aprende la sintaxis.',
            },
            verification: {
              question: '¿Cómo se escribe una etiqueta HTML correctamente? Dame un ejemplo.',
              success_criteria: {
                must_include: [
                  'Muestra sintaxis con < y > (angle brackets)',
                  'Indica que hay etiqueta de apertura y cierre',
                  'Proporciona al menos un ejemplo correcto',
                ],
                min_completeness: 60,
                understanding_level: 'understood',
              },
              max_attempts: 3,
            },
            commonMistakes: [
              'Olvidar cerrar etiquetas',
              'Confundir / de cierre con \\ (backslash)',
            ],
          },
          {
            id: 'html_activity_003',
            type: 'practice',
            complexity: 'moderate',
            keyPointIndex: 2,
            teaching: {
              agent_instruction: 'Guía al estudiante para crear su primera página HTML completa. Explica la estructura básica: DOCTYPE (declaración), html (raíz), head (metadata), body (contenido visible). Pide que escriba el código paso a paso.',
              target_length: '200-300 palabras',
              context: 'Ejercicio práctico. El estudiante debe escribir código real.',
            },
            verification: {
              question: 'Escribe el código HTML completo para una página con: DOCTYPE, estructura básica (html, head, body), un título "Mi Primera Web", un encabezado h1 que diga "Hola Mundo" y un párrafo con tu nombre.',
              success_criteria: {
                must_include: [
                  'Incluye <!DOCTYPE html>',
                  'Tiene estructura con <html>, <head> y <body>',
                  'Incluye <title> dentro de head',
                  'Tiene <h1> dentro de body',
                  'Incluye al menos un párrafo <p>',
                ],
                min_completeness: 70,
                understanding_level: 'applied',
              },
              max_attempts: 4,
            },
            commonMistakes: [
              'Poner title fuera de head',
              'Olvidar DOCTYPE',
              'No cerrar alguna etiqueta',
            ],
          },
          {
            id: 'html_activity_004',
            type: 'reflection',
            complexity: 'simple',
            keyPointIndex: 3,
            teaching: {
              agent_instruction: 'Haz que el estudiante reflexione sobre lo aprendido. Pregunta qué pasaría si no cerrara las etiquetas. Pide que piense en una analogía propia para explicar HTML a un amigo.',
              target_length: '100-200 palabras',
              context: 'Consolidación del aprendizaje.',
            },
            verification: {
              question: '¿Qué crees que pasaría si no cierras una etiqueta? ¿Cómo le explicarías HTML a un amigo que nunca ha programado?',
              success_criteria: {
                must_include: [
                  'Menciona que el navegador puede mostrar errores o contenido mal estructurado',
                  'Proporciona una analogía o explicación simple propia',
                ],
                min_completeness: 50,
                understanding_level: 'understood',
              },
              max_attempts: 2,
            },
          },
          {
            id: 'html_activity_005',
            type: 'closing',
            complexity: 'simple',
            keyPointIndex: 0,
            teaching: {
              agent_instruction: 'Resume los puntos clave de la lección: HTML es marcado no programación, etiquetas estructuran contenido, toda página tiene DOCTYPE/html/head/body. Felicita brevemente y sugiere siguiente paso: aprender más etiquetas o CSS.',
              target_length: '100-150 palabras',
              context: 'Cierre de lección.',
            },
            verification: {
              question: '¿Qué fue lo más importante que aprendiste hoy sobre HTML?',
              success_criteria: {
                must_include: [
                  'Menciona al menos un concepto clave aprendido',
                ],
                min_completeness: 40,
                understanding_level: 'memorized',
              },
              max_attempts: 1,
            },
          },
        ],
      },
    },
  })
  console.log('✅ Lección creada:', lesson.title)

  console.log('')
  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('Datos creados:')
  console.log(`  - Usuario: ${testUser.email} (ID: ${testUser.id})`)
  console.log(`  - Curso: ${course.title}`)
  console.log(`  - Lección: ${lesson.title} (5 actividades)`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
