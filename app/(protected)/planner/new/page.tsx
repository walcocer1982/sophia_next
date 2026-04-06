import { prisma } from '@/lib/prisma'
import { CoursePlannerLayout } from '@/components/planner/course-planner-layout'

export default async function NewCoursePage() {
  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return <CoursePlannerLayout careers={careers} />
}
