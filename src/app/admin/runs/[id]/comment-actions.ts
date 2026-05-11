"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const scopeSchema = z.enum(["run", "message"]);

export async function addComment(input: {
  scope: "run" | "message";
  targetId: string;
  content: string;
  runId: string;
}) {
  const scope = scopeSchema.parse(input.scope);
  const content = input.content.trim();
  if (content.length === 0) return { ok: false, error: "Empty comment" };

  await prisma.comment.create({
    data: { scope, targetId: input.targetId, content },
  });
  revalidatePath(`/runs/${input.runId}`);
  return { ok: true };
}

export async function deleteComment(input: { id: string; runId: string }) {
  await prisma.comment.delete({ where: { id: input.id } });
  revalidatePath(`/runs/${input.runId}`);
  return { ok: true };
}

export async function saveRunNotes(input: { runId: string; notes: string }) {
  await prisma.testRun.update({
    where: { id: input.runId },
    data: { notes: input.notes },
  });
  revalidatePath(`/runs/${input.runId}`);
  return { ok: true };
}
