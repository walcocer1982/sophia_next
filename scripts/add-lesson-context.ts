/**
 * Script para agregar context a lecciones existentes
 * Uso: npx tsx scripts/add-lesson-context.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar la lección IPERC
  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { title: { contains: 'IPERC' } },
        { title: { contains: 'Matriz' } },
        { slug: { contains: 'iperc' } },
      ]
    },
    select: {
      id: true,
      title: true,
      contentJson: true,
    }
  })

  if (!lesson) {
    console.log('No se encontró lección IPERC')
    // Listar todas las lecciones
    const allLessons = await prisma.lesson.findMany({
      select: { id: true, title: true }
    })
    console.log('Lecciones disponibles:', allLessons)
    return
  }

  console.log(`Encontrada lección: ${lesson.title} (${lesson.id})`)

  // El contexto normativo para IPERC según Ley 29783 de Perú
  const lessonContext = {
    normativa: "Ley 29783, DS 005-2012-TR, RM 050-2013-TR",
    pais: "Perú",
    sector: "General (aplicable a todos los sectores)",
    matriz: {
      tipo: "5x5",
      probabilidad: "Suma de 4 índices: Personas expuestas (1-3), Procedimientos existentes (1-3), Capacitación (1-3), Exposición al riesgo (1-3). Rango total: 4-12",
      severidad: "1 = Lesión sin incapacidad (primeros auxilios), 2 = Lesión con incapacidad temporal (descanso médico), 3 = Lesión con incapacidad permanente o muerte",
      niveles: "Trivial (4), Tolerable (5-8), Moderado (9-16), Importante (17-24), Intolerable (25-36)"
    },
    jerarquia_controles: "1. Eliminación > 2. Sustitución > 3. Controles de Ingeniería > 4. Controles Administrativos > 5. EPP",
    referencias: [
      "Ley 29783 - Ley de Seguridad y Salud en el Trabajo",
      "DS 005-2012-TR - Reglamento de la Ley 29783",
      "RM 050-2013-TR - Formatos referenciales SGSST"
    ],
    glosario: {
      "IPERC": "Identificación de Peligros, Evaluación de Riesgos y Control",
      "Peligro": "Fuente, situación o acto con potencial de causar daño",
      "Riesgo": "Probabilidad de que un peligro se materialice causando daño",
      "Control": "Medida que elimina o reduce el riesgo"
    }
  }

  // Obtener contentJson actual
  const currentContent = lesson.contentJson as { activities?: unknown[], context?: unknown }

  // Agregar context al contentJson
  const updatedContent = {
    context: lessonContext,
    ...currentContent,
  }

  // Actualizar en la base de datos
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      contentJson: updatedContent as Parameters<typeof prisma.lesson.update>[0]['data']['contentJson']
    }
  })

  console.log('Context agregado exitosamente!')
  console.log('Nuevo context:', JSON.stringify(lessonContext, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
