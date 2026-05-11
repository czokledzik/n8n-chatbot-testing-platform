"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

const scopeSchema = z.enum(["run", "message"]);

export async function addClientComment(input: {
  slug: string;
  runId: string;
  scope: "run" | "message";
  targetId: string;
  content: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = await requireClient(input.slug);

  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id },
    include: { messages: { select: { id: true } } },
  });
  if (!run) return { ok: false, error: "Run not found" };

  const scope = scopeSchema.parse(input.scope);
  if (scope === "message" && !run.messages.some((m) => m.id === input.targetId)) {
    return { ok: false, error: "Message not in this run" };
  }
  if (scope === "run" && input.targetId !== run.id) {
    return { ok: false, error: "Run id mismatch" };
  }

  const content = input.content.trim();
  if (!content) return { ok: false, error: "Empty comment" };

  await prisma.comment.create({
    data: { scope, targetId: input.targetId, content, authorScope: "client" },
  });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}

export async function deleteClientComment(input: {
  slug: string;
  runId: string;
  commentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = await requireClient(input.slug);

  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id },
    include: { messages: { select: { id: true } } },
  });
  if (!run) return { ok: false, error: "Run not found" };

  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
  });
  if (!comment) return { ok: false, error: "Comment not found" };

  const ownsTarget =
    (comment.scope === "run" && comment.targetId === run.id) ||
    (comment.scope === "message" &&
      run.messages.some((m) => m.id === comment.targetId));
  if (!ownsTarget) return { ok: false, error: "Not your comment" };
  if (comment.authorScope !== "client")
    return { ok: false, error: "Cannot delete admin comments" };

  await prisma.comment.delete({ where: { id: input.commentId } });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}
