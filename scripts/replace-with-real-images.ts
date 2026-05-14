import { prisma } from '../lib/prisma'
import { uploadImage } from '../lib/cloudinary'
import type { LessonContent } from '../types/lesson'

interface Replacement {
  lessonTitleContains: string
  activityId: string
  realImageUrl: string
  description: string
  source: string
}

// Todas las URLs fueron verificadas (HTTP 200, content-type image/*) antes de
// agregarse aquí. Wikimedia Special:FilePath redirige al archivo real y
// es estable frente a re-uploads.
const REPLACEMENTS: Replacement[] = [
  // ========== Perforación Subterránea ==========
  {
    lessonTitleContains: 'Perforación Subterránea',
    activityId: 'act-1-1',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Bergwerk_Reiche_Zeche_Freiberg_05.JPG',
    description:
      'Equipo de perforación subterránea (jumbo / Bohrwagen) en la mina-escuela Reiche Zeche, Freiberg. Muestra el brazo perforador montado sobre carro autopropulsado, el mismo concepto usado por jumbos de desarrollo Sandvik DD322i y Epiroc Boomer en operaciones peruanas como Cerro Lindo, Buenaventura y Antamina.',
    source: 'Wikimedia Commons (CC-BY-SA)',
  },
  {
    lessonTitleContains: 'Perforación Subterránea',
    activityId: 'act-1-2',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Stope_in_Treadwell_gold_mine.jpg',
    description:
      'Tajeo (stope) de la mina de oro Treadwell donde se realizaba perforación de producción a tiro largo para arrancar mineral. A diferencia del jumbo de desarrollo (que avanza galerías), el equipo de producción perfora taladros largos verticales o inclinados para volar grandes volúmenes de roca mineralizada.',
    source: 'Wikimedia Commons',
  },
  {
    lessonTitleContains: 'Perforación Subterránea',
    activityId: 'act-1-3',
    realImageUrl:
      'https://compumet.com.pe/wp-content/uploads/2020/02/Desquinchado.jpg',
    description:
      'Minero peruano realizando desatado de rocas (desquinche) con barretilla en una galería subterránea. La barretilla mide entre 1.20 m y 3.70 m: un extremo en punta para golpear y el otro en garra para palanquear las rocas sueltas del techo y hastiales. El desatado es obligatorio antes de cualquier trabajo en la labor (DS 024-2016-EM, Reglamento de Seguridad Minera del Perú).',
    source: 'Compumet EIRL (Perú) — equipos de minería',
  },

  // ========== Yacimientos Minerales ==========
  {
    lessonTitleContains: 'Yacimientos Minerales',
    activityId: 'act-2-2',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Vistas_de_Yanacancha%2C_mina_Antamina_03.jpg',
    description:
      'Vista de Yanacancha, mina Antamina (distrito de San Marcos, Áncash). Antamina es el mayor skarn polimetálico del mundo en producción y un ejemplo emblemático del cinturón metalogenético cretácico-paleógeno del Perú. Procesa cobre, zinc, molibdeno, plomo y plata.',
    source: 'Wikimedia Commons',
  },
  {
    lessonTitleContains: 'Yacimientos Minerales',
    activityId: 'act-2-3',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Native_copper_pods_in_garnet-pyroxene_skarn_%28Madison_Gold_Skarn_Deposit%2C_Late_Cretaceous%2C_80_Ma%3B_west_of_Silver_Star%2C_Montana%2C_USA%29_1.jpg',
    description:
      'Muestra real de roca skarn con bolsas de cobre nativo en matriz de granate-piroxeno (Madison Gold Skarn, Cretácico tardío, Montana). Los skarns se forman por contacto entre un intrusivo félsico y rocas carbonatadas; los minerales índice son granate (grosularia-andradita), piroxeno (diópsido-hedenbergita) y wollastonita. En Perú: Antamina, Tintaya, Las Bambas (skarn-pórfido).',
    source: 'Wikimedia Commons (Montana Bureau of Mines and Geology)',
  },

  // ========== Flotación ==========
  {
    lessonTitleContains: 'Flotación',
    activityId: 'act-3-1',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Prominenthill-flotation.jpg',
    description:
      'Celdas de flotación reales en una planta concentradora cargadas con espuma mineralizada. La espuma negra-grisácea contiene los sulfuros valiosos (Cu, Pb, Zn) que se adhieren a las burbujas; la pulpa estéril (relave) se hunde y se descarga por la parte inferior. Es el corazón del proceso de concentración por flotación que usan plantas como Antamina, Toquepala, Cerro Verde y Cerro Lindo.',
    source: 'Wikimedia Commons',
  },
  {
    lessonTitleContains: 'Flotación',
    activityId: 'act-3-2',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/FlCell.PNG',
    description:
      'Diagrama de una celda de flotación con flujos numerados: [1] entrada de pulpa (mineral + agua + reactivos), [2] inyección de aire, [3] zona de mineralización donde las partículas hidrofóbicas se adhieren a las burbujas, [4] espuma cargada que rebosa hacia el concentrado, [5] descarga del relave. Este es el principio que se replica en serie como rougher → scavenger → cleaner.',
    source: 'Wikimedia Commons (artículo Froth flotation)',
  },
  {
    lessonTitleContains: 'Flotación',
    activityId: 'act-3-3',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Collectors.png',
    description:
      'Estructuras químicas de los principales colectores (surfactantes) usados en flotación: xantatos (sulfuros de Cu, Pb, Zn), ditiofosfatos (oro y plata), aminas (no-sulfuros como sales potásicas) y ácidos grasos (oxidados como hematita, fluorita). El colector da hidrofobicidad selectiva al mineral valioso para que se pegue a la burbuja. Se complementa con espumantes (MIBC, MIBC, aceite de pino) y modificadores (cal para subir pH, NaCN como deprimente).',
    source: 'Wikimedia Commons (artículo Froth flotation)',
  },
  {
    lessonTitleContains: 'Flotación',
    activityId: 'act-3-4',
    realImageUrl:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Operaciones_Antamina_-_panoramio.jpg',
    description:
      'Vista panorámica de las operaciones de Antamina (Huari, Áncash, Perú): tajo abierto e infraestructura de procesamiento. Antamina es el mayor skarn polimetálico del mundo y procesa Cu, Zn, Mo, Pb y Ag mediante flotación selectiva.',
    source: 'Wikimedia Commons',
  },
]

// Conceptos para los que NO se encontró URL pública verificable.
// Se documenta aquí para que el equipo educativo cargue manualmente.
const NOT_FOUND = [
  {
    activityId: 'act-2-1',
    concept: 'Mapa metalogenético del Perú con cinturones mineros',
    bestSource:
      'INGEMMET — Mapa Metalogenético del Perú 2020 (PDF): https://portal.ingemmet.gob.pe/documents/73138/1231310/Mapa-Metalogenetico-del-Peru.pdf',
    note: 'Descargar PDF, recortar la imagen del mapa y subir manualmente vía /planner/...',
  },
  {
    activityId: 'act-2-4',
    concept: 'Diagrama comparativo pórfido vs skarn (esquema geológico)',
    bestSource:
      'USGS Bulletin 1693 (Cox & Singer, Mineral Deposit Models): https://pubs.usgs.gov/bul/b1693/Md18b.pdf — figura 57 (Cu skarn cross section)',
    note: 'No hay versión PNG/JPG pública directa; extraer figura del PDF si se desea.',
  },
]

async function downloadImage(url: string, retries = 3): Promise<Buffer> {
  console.log(`  Descargando: ${url}`)
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'SophiaNextBot/1.0 (educational; contact: walther.alcocer@cetemin.edu.pe)',
          Accept: 'image/jpeg,image/png,image/*,*/*',
        },
        redirect: 'follow',
      })
      if (res.status === 429 && attempt < retries) {
        const wait = attempt * 5000
        console.log(`  Rate limit. Esperando ${wait}ms... (intento ${attempt}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const ct = res.headers.get('content-type') || ''
      if (!ct.startsWith('image/')) {
        throw new Error(`No es imagen: content-type=${ct}`)
      }
      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (e) {
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  throw new Error('All retries failed')
}

async function processReplacement(rep: Replacement) {
  console.log(`\n=== ${rep.lessonTitleContains} / ${rep.activityId} ===`)

  const lesson = await prisma.lesson.findFirst({
    where: { title: { contains: rep.lessonTitleContains, mode: 'insensitive' } },
    select: { id: true, title: true, contentJson: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!lesson) {
    console.error(`  Lección no encontrada`)
    return
  }

  const content = lesson.contentJson as unknown as LessonContent
  const activity = content.activities.find(a => a.id === rep.activityId)
  if (!activity) {
    console.error(`  Actividad ${rep.activityId} no encontrada`)
    return
  }

  try {
    const buffer = await downloadImage(rep.realImageUrl)
    console.log(`  Tamaño: ${(buffer.length / 1024).toFixed(0)} KB`)
    console.log(`  Subiendo a Cloudinary...`)
    const cloudinaryUrl = await uploadImage(buffer, `sophia/lessons/${lesson.id}`)
    console.log(`  Cloudinary: ${cloudinaryUrl}`)

    if (!activity.teaching) {
      activity.teaching = { agent_instruction: '' }
    }
    activity.teaching.images = [
      {
        url: cloudinaryUrl,
        description: rep.description,
        showWhen: 'on_start',
      },
    ]

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { contentJson: content as unknown as object },
    })
    console.log(`  ✓ Lección actualizada (fuente: ${rep.source})`)
  } catch (e) {
    console.error(`  ✗ Error:`, (e as Error).message)
  }
}

async function main() {
  console.log('Reemplazando imágenes IA con fotos reales públicas verificadas...\n')
  for (const rep of REPLACEMENTS) {
    await processReplacement(rep)
    await new Promise(r => setTimeout(r, 3000))
  }

  if (NOT_FOUND.length > 0) {
    console.log('\n=== CONCEPTOS SIN URL PÚBLICA VERIFICABLE ===')
    for (const nf of NOT_FOUND) {
      console.log(`\n${nf.activityId}: ${nf.concept}`)
      console.log(`  Mejor fuente: ${nf.bestSource}`)
      console.log(`  Nota: ${nf.note}`)
    }
  }
  console.log('\n=== TERMINADO ===')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
