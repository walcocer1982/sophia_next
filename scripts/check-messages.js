const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.lessonSession.findFirst({
    orderBy: { startedAt: 'desc' },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          timestamp: true,
          activityId: true,
        }
      }
    }
  });

  console.log('=== SESION ===');
  console.log('ID:', session?.id);
  console.log('ActivityId:', session?.activityId);
  console.log('');
  console.log('=== MENSAJES (' + (session?.messages?.length || 0) + ') ===');

  session?.messages?.forEach((m, i) => {
    console.log('---');
    console.log(i + 1 + '. [' + m.role + '] activityId:', m.activityId);
    console.log('   timestamp:', m.timestamp);
    console.log('   content:', m.content.substring(0, 100) + '...');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
