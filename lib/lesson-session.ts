import { prisma } from '@/lib/prisma'

/**
 * Load a LessonSession owned by `userId`, with consistent ownership and
 * (optionally) active-state checks.
 *
 * Previously every route inlined `prisma.lessonSession.findFirst({ where: {
 * id, userId } })`, but some included `endedAt: null` and some didn't — so a
 * few endpoints would silently operate on already-ended sessions. This is the
 * single place that decision is made.
 *
 * Returns the session (typed with optional `lesson` relation) or `null` when
 * not found / not owned / not active.
 */
export async function getLessonSessionSafe(
  sessionId: string,
  userId: string,
  opts: { mustBeActive?: boolean; includeContent?: boolean } = {},
) {
  return prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId,
      ...(opts.mustBeActive ? { endedAt: null } : {}),
    },
    include: opts.includeContent
      ? { lesson: { select: { contentJson: true, title: true } } }
      : undefined,
  })
}
