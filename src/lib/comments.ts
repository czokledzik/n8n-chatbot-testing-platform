import "server-only";
import { prisma } from "@/lib/db";

export type CommentScope = "run" | "message";

export async function getComments(scope: CommentScope, targetId: string) {
  return prisma.comment.findMany({
    where: { scope, targetId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCommentCounts(
  scope: CommentScope,
  targetIds: string[],
): Promise<Record<string, number>> {
  if (targetIds.length === 0) return {};
  const rows = await prisma.comment.groupBy({
    by: ["targetId"],
    where: { scope, targetId: { in: targetIds } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.targetId, r._count._all]));
}
