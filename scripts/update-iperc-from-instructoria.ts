/**
 * Script para actualizar contentJson de IPERC con instrucciones de Instructoria
 *
 * Uso: npx tsx scripts/update-iperc-from-instructoria.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const newContentJson = {
  "context": {
    "pais": "Perú",
    "normativa": "Ley 29783, DS 005-2012-TR, RM 050-2013-TR",
    "referencias": [
      "Ley 29783 - Ley de Seguridad y Salud en el Trabajo",
      "DS 005-2012-TR - Reglamento de la Ley 29783",
      "RM 050-2013-TR - Formatos referenciales SGSST"
    ],
    "jerarquia_controles": "1° Eliminación > 2° Sustitución > 3° Controles de ingeniería > 4° Controles administrativos > 5° EPP"
  },
  "activities": [
    {
      "id": "activity-001",
      "type": "explanation",
      "complexity": "moderate",
      "keyPointIndex": 0,
      "agent_instruction": "Explica qué es IPERC y su importancia en la prevención de accidentes laborales. Define la diferencia entre peligro (fuente de daño) y riesgo (probabilidad de que ocurra el daño). Usa ejemplos del sector construcción peruano.",
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
      "complexity": "simple",
      "keyPointIndex": 0,
      "agent_instruction": "Enseña cómo identificar peligros: mecánicos, físicos, químicos, biológicos, ergonómicos, psicosociales y locativos. Explica que se debe recorrer el área de trabajo y observar todas las actividades.",
      "verification": {
        "question": "Te describo un taller de soldadura: hay máquinas de soldar funcionando, trabajadores cortando metal, humos en el ambiente, ruido constante y cables en el piso. ¿Qué peligros identificas? Clasifícalos por tipo.",
        "criteria": [
          "Identifica peligros mecánicos (máquinas, corte)",
          "Identifica peligros químicos (humos)",
          "Identifica peligros físicos (ruido)",
          "Identifica peligros locativos o eléctricos (cables)"
        ]
      }
    },
    {
      "id": "activity-003",
      "type": "practice",
      "complexity": "moderate",
      "keyPointIndex": 1,
      "agent_instruction": "Explica BREVEMENTE la matriz de evaluación de riesgos: Probabilidad (Baja=1, Media=2, Alta=3) x Severidad (Ligeramente dañino=1, Dañino=2, Extremadamente dañino=3). Resultado: Trivial (1-2), Tolerable (3-4), Moderado (5-6), Importante (8-9), Intolerable (12+).",
      "verification": {
        "question": "Si tenemos el peligro 'proyección de chispas durante soldadura' que ocurre frecuentemente (probabilidad Alta=3) y puede causar quemaduras en piel (severidad Dañina=2), ¿cuál es el nivel de riesgo? Muéstrame el cálculo.",
        "criteria": [
          "Identifica probabilidad Alta = 3",
          "Identifica severidad Dañina = 2",
          "Calcula 3 x 2 = 6",
          "Clasifica como riesgo Moderado"
        ]
      }
    },
    {
      "id": "activity-004",
      "type": "explanation",
      "complexity": "moderate",
      "keyPointIndex": 2,
      "agent_instruction": "Explica la jerarquía de controles: 1° Eliminación, 2° Sustitución, 3° Controles de ingeniería, 4° Controles administrativos (señalización, capacitación, procedimientos), 5° EPP (última opción). Enfatiza que el EPP solo protege al trabajador pero no elimina el peligro.",
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
      "complexity": "moderate",
      "keyPointIndex": 3,
      "agent_instruction": "Guía al estudiante para que aplique toda la metodología IPERC: 1) Elegir un área de trabajo (su casa, oficina, taller), 2) Identificar mínimo 2 peligros, 3) Evaluar cada riesgo con la matriz, 4) Proponer controles usando la jerarquía.",
      "verification": {
        "question": "Para tu evaluación final, elige un lugar que conozcas (tu casa, trabajo o lugar público). Identifica 2 peligros y para cada uno indica: descripción, tipo, riesgo asociado, probabilidad, severidad, nivel de riesgo (cálculo) y controles propuestos.",
        "criteria": [
          "Identifica 2 peligros reales y diferentes",
          "Clasifica correctamente el tipo de cada peligro",
          "Calcula el nivel de riesgo correctamente (P x S)",
          "Propone controles apropiados según la jerarquía"
        ]
      }
    }
  ]
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { id: 'lesson-iperc-001' },
        { title: { contains: 'IPERC' } },
        { slug: { contains: 'iperc' } },
      ]
    },
    select: { id: true, title: true }
  })

  if (!lesson) {
    console.log('No se encontró lección IPERC')
    return
  }

  console.log(`Actualizando: ${lesson.title} (${lesson.id})`)

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      contentJson: newContentJson as Parameters<typeof prisma.lesson.update>[0]['data']['contentJson']
    }
  })

  console.log('\n✅ contentJson actualizado con instrucciones de Instructoria')
  console.log('\nCambios clave:')
  console.log('- activity-003: Matriz con valores específicos (P x S)')
  console.log('- Todos los agent_instruction más detallados')
  console.log('- Criterios de verificación actualizados')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
