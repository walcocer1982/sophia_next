import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1. Crear usuario de prueba
  const user = await prisma.user.upsert({
    where: { email: 'test@instructoria.dev' },
    update: {},
    create: {
      email: 'test@instructoria.dev',
      name: 'Usuario de Prueba',
      emailVerified: new Date(),
    },
  })

  console.log('✅ Usuario creado:', user.email)

  // 1.1 Crear user-test con id fijo
  const userTest = await prisma.user.upsert({
    where: { id: '1000' },
    update: {},
    create: {
      id: '1000',
      email: 'user-test@instructoria.dev',
      name: 'User Test',
      emailVerified: new Date(),
    },
  })

  console.log('✅ User-test creado:', userTest.email)

  // 2. Contenido de la lección
  const lessonContent = {
    lesson: {
      title: 'Fundamentos de Seguridad Web',
      description:
        'Aprende los conceptos básicos de seguridad en aplicaciones web',
      duration_minutes: 45,
    },
    moments: [
          {
            id: 'moment_001',
            title: 'Conceptos Fundamentales',
            activities: [
              {
                id: 'activity_001',
                type: 'explanation',
                teaching: {
                  main_topic: '¿Qué es la seguridad web?',
                  key_points: [
                    'Protección de datos sensibles',
                    'Prevención de ataques comunes',
                    'Confidencialidad, integridad y disponibilidad',
                  ],
                  approach: 'conversational',
                },
                verification: {
                  question:
                    '¿Cuáles son los tres pilares de la seguridad de la información?',
                  criteria: [
                    'Menciona confidencialidad',
                    'Menciona integridad',
                    'Menciona disponibilidad',
                  ],
                  target_length: 'short',
                  hints: [
                    'Piensa en las tres propiedades fundamentales que protegen la información',
                    'Se conocen como la triada CIA en inglés',
                  ],
                },
                student_questions: {
                  approach: 'answer_then_redirect',
                  max_tangent_responses: 2,
                },
                guardrails: [
                  {
                    trigger: 'inappropriate_content',
                    response:
                      'Este es un espacio de aprendizaje profesional. Mantengamos el enfoque en seguridad web.',
                  },
                ],
              },
              {
                id: 'activity_002',
                type: 'explanation',
                teaching: {
                  main_topic: 'Vulnerabilidades comunes: OWASP Top 10',
                  key_points: [
                    'Injection (SQL, XSS)',
                    'Broken Authentication',
                    'Sensitive Data Exposure',
                  ],
                  approach: 'practical',
                },
                verification: {
                  question:
                    'Explica con tus palabras qué es una inyección SQL y por qué es peligrosa',
                  criteria: [
                    'Explica que es insertar código SQL malicioso',
                    'Menciona que puede acceder/modificar la base de datos',
                    'Da un ejemplo o consecuencia real',
                  ],
                  target_length: 'medium',
                },
                student_questions: {
                  approach: 'answer_then_redirect',
                  max_tangent_responses: 2,
                },
                guardrails: [],
              },
            ],
          },
          {
            id: 'moment_002',
            title: 'Buenas Prácticas',
            activities: [
              {
                id: 'activity_003',
                type: 'practice',
                teaching: {
                  main_topic: 'Implementando seguridad desde el diseño',
                  key_points: [
                    'Validación de entrada',
                    'Sanitización de datos',
                    'Principio de menor privilegio',
                  ],
                  approach: 'practical',
                },
                verification: {
                  question:
                    '¿Qué medidas implementarías para proteger un formulario de login?',
                  criteria: [
                    'Menciona HTTPS/SSL',
                    'Menciona validación de entrada',
                    'Menciona rate limiting o protección contra fuerza bruta',
                    'Menciona hash de contraseñas',
                  ],
                  target_length: 'long',
                },
                student_questions: {
                  approach: 'answer_then_redirect',
                  max_tangent_responses: 3,
                },
                guardrails: [],
              },
            ],
          },
        ],
  }

  // 3. Crear lección
  const lesson = await prisma.lesson.upsert({
    where: { slug: 'seguridad-web-fundamentos' },
    update: {},
    create: {
      title: 'Fundamentos de Seguridad Web',
      description:
        'Aprende los conceptos básicos de seguridad en aplicaciones web y protege tus sistemas',
      slug: 'seguridad-web-fundamentos',
      courseTitle: 'Ciberseguridad Práctica',
      category: 'Ciberseguridad',
      order: 1,
      estimatedMinutes: 45,
      difficulty: 'básico',
      contentJson: lessonContent,
      isPublished: true,
    },
  })

  console.log('✅ Lección creada:', lesson.title)

  // 4. Contenido de la segunda lección (HTML Básico - MÁS SIMPLE para testing)
  const htmlLessonContent = {
    lesson: {
      title: 'HTML Básico',
      description: 'Aprende los fundamentos de HTML para crear páginas web',
      duration_minutes: 20,
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
              main_topic: '¿Qué es HTML?',
              key_points: [
                'HTML significa HyperText Markup Language',
                'Es el lenguaje de marcado para crear páginas web',
                'Usa etiquetas para estructurar contenido',
              ],
              approach: 'conversational',
            },
            verification: {
              question: '¿Qué significa HTML y para qué se usa?',
              criteria: [
                'Menciona que HTML significa HyperText Markup Language',
                'Explica que se usa para crear páginas web',
              ],
              target_length: 'short',
              hints: [
                'HTML es un acrónimo de cuatro palabras en inglés',
                'Piensa en qué necesitas para crear una página web',
              ],
            },
            student_questions: {
              approach: 'answer_then_redirect',
              max_tangent_responses: 2,
            },
            guardrails: [],
          },
          {
            id: 'html_activity_002',
            type: 'practice',
            teaching: {
              main_topic: 'Etiquetas básicas de HTML',
              key_points: [
                '<h1> a <h6> para encabezados',
                '<p> para párrafos',
                '<a> para enlaces',
              ],
              approach: 'practical',
            },
            verification: {
              question:
                'Nombra 3 etiquetas HTML básicas y explica para qué sirve cada una',
              criteria: [
                'Menciona al menos 3 etiquetas HTML',
                'Explica correctamente el uso de cada etiqueta',
              ],
              target_length: 'medium',
              hints: [
                'Piensa en etiquetas para títulos, texto y enlaces',
                'Las etiquetas se escriben entre < y >',
              ],
            },
            student_questions: {
              approach: 'answer_then_redirect',
              max_tangent_responses: 2,
            },
            guardrails: [],
          },
        ],
      },
    ],
  }

  // 5. Crear segunda lección
  const htmlLesson = await prisma.lesson.upsert({
    where: { slug: 'html-basico' },
    update: {},
    create: {
      title: 'HTML Básico',
      description:
        'Aprende los fundamentos de HTML para crear páginas web desde cero',
      slug: 'html-basico',
      courseTitle: 'Desarrollo Web Frontend',
      category: 'Desarrollo Web',
      order: 2,
      estimatedMinutes: 20,
      difficulty: 'básico',
      contentJson: htmlLessonContent,
      isPublished: true,
    },
  })

  console.log('✅ Lección HTML creada:', htmlLesson.title)
  console.log('🎉 Seed completado con 2 lecciones!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
