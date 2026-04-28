import { prisma } from '../lib/prisma'
import { uploadImage } from '../lib/cloudinary'
import type { LessonContent } from '../types/lesson'

interface Replacement {
  lessonTitleContains: string
  activityId: string
  realImageUrl: string
  description: string
}

const REPLACEMENTS: Replacement[] = [
  {
    lessonTitleContains: 'Perforación Subterránea',
    activityId: 'act-1-1',
    realImageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/b1/S%C3%B6dermalmstunneln_2009a.jpg',
    description:
      'Jumbo electrohidráulico de dos brazos perforando un frente de roca dentro de un túnel subterráneo. Equipo similar al Sandvik DD322i o Atlas Copco/Epiroc Boomer usado en grandes minas peruanas como las de Buenaventura, Cerro Lindo y Antamina.',
  },
  {
    lessonTitleContains: 'Flotación',
    activityId: 'act-3-4',
    realImageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a1/Operaciones_Antamina_-_panoramio.jpg',
    description:
      'Vista panorámica de las operaciones de Antamina (Huari, Áncash, Perú) mostrando el tajo abierto y la infraestructura de procesamiento. Antamina es el mayor skarn polimetálico del mundo y procesa Cu, Zn, Mo, Pb y Ag.',
  },
]

async function downloadImage(url: string, retries = 3): Promise<Buffer> {
  console.log(`  Descargando: ${url}`)
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SophiaNextBot/1.0 (educational; contact: walther.alcocer@cetemin.edu.pe)',
          Accept: 'image/jpeg,image/png,image/*,*/*',
        },
      })
      if (res.status === 429 && attempt < retries) {
        const wait = attempt * 5000
        console.log(`  Rate limit. Esperando ${wait}ms... (intento ${attempt}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
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

    // Replace ALL images for this activity with the new real one
    activity.teaching.images = [{
      url: cloudinaryUrl,
      description: rep.description,
      showWhen: 'on_start',
    }]

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { contentJson: content as unknown as object },
    })
    console.log(`  Lección actualizada`)
  } catch (e) {
    console.error(`  Error:`, (e as Error).message)
  }
}

async function main() {
  console.log('Reemplazando imágenes IA con fotos reales públicas...')
  for (const rep of REPLACEMENTS) {
    await processReplacement(rep)
    // Wait between requests to respect Wikipedia rate limits
    await new Promise(r => setTimeout(r, 3000))
  }
  console.log('\n=== TERMINADO ===')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
