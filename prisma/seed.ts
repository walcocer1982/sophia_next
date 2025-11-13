import { PrismaClient, Prisma } from '@prisma/client'
import { hardcodedLesson as htmlLesson } from '../data/lesson01'
import { hardcodedLesson as promptEngLesson } from '../data/lesson02'

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
      estimatedMinutes: 45,
      contentJson: lessonContent,
      isPublished: true,
    },
  })

  console.log('✅ Lección creada:', lesson.title)

  // 4. Crear lección hardcodeada de HTML (con ID fijo para matching con LessonSession)
  const htmlLessonDb = await prisma.lesson.upsert({
    where: { slug: 'html-basico' },
    update: {
      id: htmlLesson.id, // Actualizar el ID a 'lesson-html-01'
      title: htmlLesson.lesson.title,
      description: htmlLesson.lesson.description,
      estimatedMinutes: htmlLesson.lesson.duration_minutes,
      contentJson: htmlLesson as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
    create: {
      id: htmlLesson.id, // 'lesson-html-01'
      title: htmlLesson.lesson.title,
      description: htmlLesson.lesson.description,
      slug: 'html-basico',
      estimatedMinutes: htmlLesson.lesson.duration_minutes,
      contentJson: htmlLesson as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
  })

  console.log('✅ Lección HTML hardcodeada creada:', htmlLessonDb.title)

  // 5. Crear lección hardcodeada de Prompt Engineering (con ID fijo para matching con LessonSession)
  const promptEngLessonDb = await prisma.lesson.upsert({
    where: { slug: 'prompt-engineering-basico' },
    update: {
      id: promptEngLesson.id, // Actualizar el ID a 'lesson-prompt-eng-01'
      title: promptEngLesson.lesson.title,
      description: promptEngLesson.lesson.description,
      estimatedMinutes: promptEngLesson.lesson.duration_minutes,
      contentJson: promptEngLesson as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
    create: {
      id: promptEngLesson.id, // 'lesson-prompt-eng-01'
      title: promptEngLesson.lesson.title,
      description: promptEngLesson.lesson.description,
      slug: 'prompt-engineering-basico',
      estimatedMinutes: promptEngLesson.lesson.duration_minutes,
      contentJson: promptEngLesson as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
  })

  console.log('✅ Lección Prompt Engineering hardcodeada creada:', promptEngLessonDb.title)
  console.log('🎉 Seed completado con 3 lecciones!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
