import "server-only";
import { prisma } from "@/lib/db";

export type CommentScope = "run" | "message";

export async function getComments(scope: CommentScope, targetId: string) {
  return prisma.comment.findMany({
    where: { scope, targetId },
    orderBy: { createdAt: "asc" },
  });
}
