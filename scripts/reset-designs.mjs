import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all lessons with design data
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, contentJson: true, keyPoints: true }
  })

  const designed = lessons.filter(l => {
    const cj = l.contentJson
    const acts = cj && typeof cj === 'object' && 'activities' in cj ? cj.activities?.length : 0
    return acts > 0 || (l.keyPoints && l.keyPoints.length > 0)
  })

  if (designed.length === 0) {
    console.log('No lessons with design data found.')
    return
  }

  for (const l of designed) {
    const cj = l.contentJson
    const acts = cj && typeof cj === 'object' && 'activities' in cj ? cj.activities?.length : 0
    console.log(`- ${l.id} | ${l.title} | ${acts} activities | ${(l.keyPoints || []).length} keyPoints`)
  }

  // Reset all designed lessons
  for (const l of designed) {
    await prisma.lesson.update({
      where: { id: l.id },
      data: { contentJson: null, keyPoints: [] }
    })
    console.log(`  RESET: ${l.title}`)
  }

  console.log(`\nDone. Reset ${designed.length} lesson(s).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
