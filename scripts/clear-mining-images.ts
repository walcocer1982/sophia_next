import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

const TITLES = ['Perforación Subterránea', 'Yacimientos Minerales', 'Flotación']

async function main() {
  let totalCleared = 0
  for (const titleFragment of TITLES) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: { contains: titleFragment, mode: 'insensitive' } },
      select: { id: true, title: true, contentJson: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!lesson) {
      console.log(`✗ No encontrada: "${titleFragment}"`)
      continue
    }

    const content = lesson.contentJson as unknown as LessonContent
    let cleared = 0
    for (const activity of content.activities || []) {
      if (activity.teaching?.images?.length) {
        cleared += activity.teaching.images.length
        activity.teaching.images = []
      }
      if (activity.teaching?.image) {
        cleared += 1
        delete activity.teaching.image
      }
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { contentJson: content as unknown as object },
    })

    console.log(`✓ ${lesson.title} — eliminadas ${cleared} imágenes`)
    totalCleared += cleared
  }
  console.log(`\nTotal: ${totalCleared} imágenes removidas de DB.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
