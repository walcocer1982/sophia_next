/**
 * Script para recrear la lección IPERC eliminada accidentalmente
 *
 * Uso: npx tsx scripts/recreate-iperc-lesson.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Buscar el curso de SST
  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { title: { contains: 'SST' } },
        { title: { contains: 'Seguridad' } },
        { slug: { contains: 'sst' } },
      ]
    }
  })

  if (!course) {
    console.log('No se encontró curso de SST. Cursos disponibles:')
    const allCourses = await prisma.course.findMany({
      select: { id: true, title: true, slug: true }
    })
    console.log(allCourses)

    if (allCourses.length === 0) {
      console.log('No hay cursos. Creando curso de SST...')
      const newCourse = await prisma.course.create({
        data: {
          title: 'Seguridad y Salud en el Trabajo',
          slug: 'sst-fundamentos',
          instructor: `Eres Carlos Mendoza, ingeniero de seguridad con 15 años de experiencia en el sector construcción peruano. Tu estilo es práctico y directo, usas ejemplos reales de obras. Tuteas al estudiante y usas expresiones peruanas ocasionalmente. Eres paciente pero exigente con los conceptos de seguridad.`,
          isPublished: true,
        }
      })
      console.log('Curso creado:', newCourse.id)
      await createLesson(newCourse.id)
    }
    return
  }

  console.log(`Curso encontrado: ${course.title} (${course.id})`)
  await createLesson(course.id)
}

async function createLesson(courseId: string) {
  const contentJson = {
    "context": {
      "pais": "Perú",
      "normativa": "Ley 29783, DS 005-2012-TR, RM 050-2013-TR",
      "referencias": [
        "Ley 29783 - Ley de Seguridad y Salud en el Trabajo",
        "DS 005-2012-TR - Reglamento de la Ley 29783",
        "RM 050-2013-TR - Formatos referenciales SGSST"
      ],
      "jerarquia_controles": "1. Eliminación > 2. Sustitución > 3. Controles de Ingeniería > 4. Controles Administrativos > 5. EPP"
    },
    "activities": [
      {
        "id": "activity-001",
        "type": "explanation",
        "keyPointIndex": 0,
        "agent_instruction": "Explica qué es IPERC y la diferencia entre peligro y riesgo. Usa ejemplos del sector construcción.",
        "verification": {
          "question": "¿Puedes explicarme con tus propias palabras cuál es la diferencia entre peligro y riesgo? Dame un ejemplo de tu vida cotidiana o trabajo.",
          "criteria": [
            "Define peligro como fuente o situación con potencial de daño",
            "Define riesgo como probabilidad de que ocurra el daño",
            "Proporciona un ejemplo coherente que distinga ambos conceptos"
          ]
        }
      },
      {
        "id": "activity-002",
        "type": "explanation",
        "keyPointIndex": 1,
        "agent_instruction": "Enseña los 7 tipos de peligros laborales con ejemplos de cada uno.",
        "verification": {
          "question": "Te describo un taller de soldadura: hay máquinas funcionando, humos en el ambiente, ruido constante, cables en el piso y trabajadores en posturas incómodas. ¿Qué tipos de peligros identificas? Clasifícalos.",
          "criteria": [
            "Identifica peligros mecánicos",
            "Identifica peligros químicos",
            "Identifica peligros físicos",
            "Identifica peligros locativos",
            "Identifica peligros ergonómicos"
          ]
        }
      },
      {
        "id": "activity-003",
        "type": "practice",
        "keyPointIndex": 2,
        "agent_instruction": "Explica la matriz de evaluación de riesgos según la normativa peruana.",
        "verification": {
          "question": "Si tenemos el peligro 'proyección de chispas durante soldadura' que ocurre frecuentemente y puede causar quemaduras en piel, ¿cuál es el nivel de riesgo? Muéstrame el procedimiento que usaste.",
          "criteria": [
            "Identifica los niveles de riesgo",
            "Explica que requiere acción programada"
          ]
        }
      },
      {
        "id": "activity-004",
        "type": "explanation",
        "keyPointIndex": 3,
        "agent_instruction": "Explica la jerarquía de controles según la Ley 29783, enfatizando por qué el EPP es la última opción.",
        "verification": {
          "question": "¿Por qué crees que el EPP (casco, guantes, lentes) es la última opción en la jerarquía y no la primera? Explica con tus palabras.",
          "criteria": [
            "Indica que el EPP no elimina el peligro",
            "Menciona que solo protege al trabajador individualmente",
            "Comprende que los controles superiores son más efectivos"
          ]
        }
      },
      {
        "id": "activity-005",
        "type": "closing",
        "keyPointIndex": 4,
        "agent_instruction": "Guía al estudiante para aplicar todo lo aprendido en un ejercicio práctico de identificación de peligros.",
        "verification": {
          "question": "Para tu evaluación final, elige un lugar que conozcas (tu casa, trabajo o un lugar público). Identifica 2 peligros y para cada uno indica: descripción, tipo de peligro, riesgo asociado, probabilidad, severidad, nivel de riesgo y controles propuestos.",
          "criteria": [
            "Identifica 2 peligros reales y diferentes",
            "Clasifica correctamente el tipo de cada peligro",
            "Calcula el nivel de riesgo correctamente",
            "Propone controles apropiados según la jerarquía"
          ]
        }
      }
    ]
  }

  // Crear la lección
  const lesson = await prisma.lesson.create({
    data: {
      id: 'lesson-iperc-001',
      courseId: courseId,
      title: 'IPERC - Identificación de Peligros',
      slug: 'iperc-identificacion-peligros',
      objective: 'Aprender a identificar peligros, evaluar riesgos y proponer controles según la normativa peruana',
      keyPoints: [
        'Diferencia entre peligro y riesgo',
        'Tipos de peligros laborales',
        'Matriz de evaluación de riesgos',
        'Jerarquía de controles',
        'Aplicación práctica del IPERC'
      ],
      order: 1,
      isPublished: true,
      contentJson: contentJson as Parameters<typeof prisma.lesson.create>[0]['data']['contentJson'],
    }
  })

  console.log(`\nLección creada exitosamente:`)
  console.log(`- ID: ${lesson.id}`)
  console.log(`- Título: ${lesson.title}`)
  console.log(`- Slug: ${lesson.slug}`)
  console.log(`- Actividades: 5`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
