import { prisma } from '../lib/prisma'
import { uploadVideoFromPath } from '../lib/cloudinary'
import { stat } from 'fs/promises'
import { resolve } from 'path'

const VIDEO_DIR = resolve(__dirname, '..', 'Informacion', 'videos')

interface Mapping {
  lessonTitleContains: string
  videoFile: string
}

const MAPPINGS: Mapping[] = [
  { lessonTitleContains: 'Perforación Subterránea', videoFile: 'SOFIA EOM.mp4' },
  { lessonTitleContains: 'Yacimientos Minerales', videoFile: 'SOFIA GEO.mp4' },
  { lessonTitleContains: 'Flotación', videoFile: 'SOFIA PM.mp4' },
]

async function main() {
  for (const m of MAPPINGS) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: { contains: m.lessonTitleContains, mode: 'insensitive' } },
      select: { id: true, title: true, videoUrl: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!lesson) {
      console.log(`✗ No encontrada: "${m.lessonTitleContains}"`)
      continue
    }
    if (lesson.videoUrl) {
      console.log(`= ${lesson.title} — ya tiene video, salteando.`)
      continue
    }

    const path = resolve(VIDEO_DIR, m.videoFile)
    console.log(`\n=== ${lesson.title} ===`)
    const s = await stat(path)
    console.log(`  Archivo: ${path} (${(s.size / 1024 / 1024).toFixed(1)} MB)`)

    console.log(`  Subiendo a Cloudinary (upload_large, chunked)...`)
    const url = await uploadVideoFromPath(path, `sophia/lesson-videos/${lesson.id}`)
    console.log(`  URL: ${url}`)

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { videoUrl: url },
    })
    console.log(`  ✓ Lesson actualizada`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
