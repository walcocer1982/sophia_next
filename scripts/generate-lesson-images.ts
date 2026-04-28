import { prisma } from '../lib/prisma'
import { uploadImage } from '../lib/cloudinary'
import OpenAI from 'openai'
import type { LessonContent } from '../types/lesson'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ImagePlan {
  activityId: string
  prompt: string
  description: string // Description used by AI when teaching
  showWhen: 'on_start' | 'on_reference'
}

interface LessonPlan {
  lessonTitleContains: string
  images: ImagePlan[]
}

const LESSON_PLANS: LessonPlan[] = [
  // ============== LECCIÓN 1: Perforación ==============
  {
    lessonTitleContains: 'Perforación Subterránea',
    images: [
      {
        activityId: 'act-1-1',
        prompt:
          'Educational illustration of an underground mining operation in Peru. Show a yellow Sandvik DD322i jumbo drill machine with two booms drilling into a rock face inside a mining tunnel. Include miner with helmet and headlamp supervising. Clean, professional educational style, well-lit tunnel, realistic mining environment. No text or watermarks.',
        description: 'Jumbo electrohidráulico Sandvik DD322i de dos brazos perforando un frente de roca en un túnel subterráneo. Un minero con casco y lámpara supervisa la operación. Equipo amarillo típico usado en grandes minas peruanas.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-1-2',
        prompt:
          'Side-by-side educational illustration comparing two types of underground mining drills: on the left, a development jumbo drilling a horizontal tunnel face (4x4m gallery); on the right, a production jumbo (Sandvik DL210) drilling long upward holes in a stope. Clean diagram style, labeled scenes, professional mining education.',
        description: 'Comparación entre jumbo de desarrollo (avanzando una galería de 4x4m) y jumbo de producción (perforando tiros largos en un tajeo). Muestra la diferencia funcional entre ambos equipos.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-1-3',
        prompt:
          'Educational mining safety illustration: a Peruvian miner wearing full PPE (helmet, vest, gloves, headlamp) using a long pole to scale loose rocks from the roof of a mining tunnel before drilling begins. The action is called "desatado de rocas". Show the rock face above with some loose pieces being dislodged. Realistic, well-lit mining environment.',
        description: 'Minero realizando desatado de rocas sueltas con barretilla en el techo de una galería antes de iniciar la perforación. Procedimiento obligatorio de seguridad según el DS 023-2017-EM.',
        showWhen: 'on_start',
      },
    ],
  },
  // ============== LECCIÓN 2: Yacimientos ==============
  {
    lessonTitleContains: 'Yacimientos Minerales',
    images: [
      {
        activityId: 'act-2-1',
        prompt:
          'Educational map of Peru showing the Andes mountain range running north to south, with parallel mineral belts (cinturones metalogenéticos) marked in different colors along the cordillera. Include compass rose, simple labels for major mining regions: Cajamarca, Áncash, Lima Junín, Apurímac, Arequipa. Clean, professional cartographic style.',
        description: 'Mapa del Perú mostrando los cinturones metalogenéticos paralelos a la Cordillera de los Andes. Muestra cómo los yacimientos están distribuidos en franjas por las regiones mineras del país.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-2-2',
        prompt:
          'Aerial view of a large open-pit copper mine in the Peruvian Andes, similar to Las Bambas or Cerro Verde. Show concentric terraced benches descending into a vast circular pit, with massive yellow Caterpillar trucks looking tiny by comparison. Surrounding mountains, blue sky. Realistic photo-style.',
        description: 'Vista aérea de un tajo abierto de pórfido de cobre en los Andes peruanos. Muestra los bancos concéntricos descendentes y la escala masiva característica de yacimientos como Las Bambas o Cerro Verde.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-2-3',
        prompt:
          'Geological cross-section diagram showing a skarn deposit: a quartz-monzonite intrusion (gray) intruding into limestone formations (light blue), with a metamorphic skarn aureole (orange) at the contact zone containing copper-zinc-silver mineralization. Labels in Spanish for: Intrusivo, Caliza, Skarn mineralizado, Cu-Zn-Ag. Educational diagram style.',
        description: 'Corte geológico de un skarn como Antamina: intrusivo cuarzo-monzonítico contactando con calizas Jumasha, generando una aureola metamórfica con mineralización polimetálica de Cu, Zn y Ag.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-2-4',
        prompt:
          'Educational cross-section diagram comparing porphyry copper deposit (deep, disseminated mineralization in intrusive rock) versus epithermal gold deposit (shallow, vein-controlled mineralization near surface). Two side-by-side schematic columns with depth scale on the left, showing temperature zones and mineralization style. Clean academic style with Spanish labels.',
        description: 'Diagrama comparativo de yacimientos pórfido (profundo, mineralización diseminada) y epitermal (superficial, vetas y sílice). Muestra la diferencia en profundidad de formación.',
        showWhen: 'on_start',
      },
    ],
  },
  // ============== LECCIÓN 3: Flotación ==============
  {
    lessonTitleContains: 'Flotación',
    images: [
      {
        activityId: 'act-3-1',
        prompt:
          'Close-up photo of an industrial flotation cell in a copper concentrator plant. Show the bubbling mineralized froth on top of the pulp, with copper sulfide particles attached to bubbles, dark gray pulp below. Foamy white-gray surface with metallic sheen. Industrial setting, well-lit, realistic photo style.',
        description: 'Celda de flotación con espuma mineralizada en una planta concentradora. Las burbujas cargadas de partículas de sulfuros de cobre flotan formando una espuma densa que rebosa de la celda.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-3-2',
        prompt:
          'Educational flowchart diagram of a flotation circuit: pulp enters at left, flows through Rougher cells (first flotation stage), then Scavenger cells (recovery), then up through Cleaner cells (concentrate purification 1st, 2nd, 3rd cleaning), with arrows showing flow. Each stage labeled in Spanish. Clean technical diagram with metallurgical equipment icons.',
        description: 'Diagrama del circuito de flotación: pulpa entra al rougher, pasa al scavenger para recuperar mineral escapado, y al cleaner para limpiar el concentrado en varias etapas.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-3-3',
        prompt:
          'Educational illustration showing three groups of flotation reagents in metal containers/drums on a metallurgical lab bench: (1) Collectors labeled "Xantato Z-11" with sulfur-yellow tint; (2) Frothers labeled "MIBC" clear liquid; (3) Depressors labeled "Cal" white powder and "Sulfato de Zinc" white crystals. Clean lab style, professional educational image.',
        description: 'Reactivos típicos de flotación: colectores (xantatos), espumantes (MIBC) y depresores (cal y sulfato de zinc). Cada uno cumple una función específica para hacer flotar selectivamente el mineral valioso.',
        showWhen: 'on_start',
      },
      {
        activityId: 'act-3-4',
        prompt:
          'Wide industrial photo of a large mineral processing plant in Peru, similar to Cerro Verde concentrator. Show the rows of large flotation cells, conveyor belts, ball mills in the background, pipes and instrumentation. Workers in PPE walking on metal platforms. Clean industrial photo style, daytime.',
        description: 'Planta concentradora de cobre tipo Cerro Verde: filas de celdas de flotación grandes, molinos de bolas y bandas transportadoras. Es una de las plantas más grandes del Perú.',
        showWhen: 'on_start',
      },
    ],
  },
]

async function generateImage(prompt: string): Promise<Buffer> {
  console.log('  Generating with DALL-E 3...')
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json',
  })
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('No image data returned')
  return Buffer.from(b64, 'base64')
}

async function processLesson(plan: LessonPlan) {
  console.log(`\n=== Procesando: ${plan.lessonTitleContains} ===`)

  const lesson = await prisma.lesson.findFirst({
    where: { title: { contains: plan.lessonTitleContains, mode: 'insensitive' } },
    select: { id: true, title: true, contentJson: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!lesson) {
    console.error(`  Lección no encontrada: ${plan.lessonTitleContains}`)
    return
  }
  console.log(`  Lección: ${lesson.title}`)

  const content = lesson.contentJson as unknown as LessonContent

  for (const imgPlan of plan.images) {
    console.log(`\n  Actividad ${imgPlan.activityId}:`)
    try {
      const buffer = await generateImage(imgPlan.prompt)
      console.log(`  Subiendo a Cloudinary...`)
      const url = await uploadImage(buffer, `sophia/lessons/${lesson.id}`)
      console.log(`  URL: ${url}`)

      const activity = content.activities.find(a => a.id === imgPlan.activityId)
      if (!activity) {
        console.warn(`  Actividad no encontrada: ${imgPlan.activityId}`)
        continue
      }

      // Add image to activity teaching block
      if (!activity.teaching.images) activity.teaching.images = []
      activity.teaching.images.push({
        url,
        description: imgPlan.description,
        showWhen: imgPlan.showWhen,
      })
    } catch (e) {
      console.error(`  Error en ${imgPlan.activityId}:`, (e as Error).message)
    }
  }

  // Save updated content back to DB
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { contentJson: content as unknown as object },
  })
  console.log(`  Lección actualizada en DB`)
}

async function main() {
  console.log('Generando imágenes para las 3 lecciones de minería peruana...')

  for (const plan of LESSON_PLANS) {
    await processLesson(plan)
  }

  console.log('\n=== TERMINADO ===')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
