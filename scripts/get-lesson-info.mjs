import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const l = await p.lesson.findUnique({ where: { id: 'lesson-iperc-001' }, select: { id: true, title: true, courseId: true } })
console.log(JSON.stringify(l, null, 2))
await p.$disconnect()
