import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.lessonSession.findMany({
    where: { lessonId: 'lesson-iperc-001' },
    select: { id: true }
  })
  console.log('Sessions to delete:', sessions.length)
  if (sessions.length > 0) {
    await prisma.lessonSession.deleteMany({ where: { lessonId: 'lesson-iperc-001' } })
    console.log('Deleted')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
