"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function deleteRunAndRedirect(runId: string): Promise<never> {
  await prisma.testRun.delete({ where: { id: runId } });
  revalidatePath("/admin/runs");
  revalidatePath("/admin");
  redirect("/admin/runs");
}

export async function setDevFixed(input: {
  runId: string;
  fixed: boolean;
}): Promise<{ ok: boolean }> {
  await prisma.testRun.update({
    where: { id: input.runId },
    data: { devFixedAt: input.fixed ? new Date() : null },
  });
  revalidatePath(`/admin/runs/${input.runId}`);
  revalidatePath("/admin/runs");
  return { ok: true };
}

export async function saveDevFixNote(input: {
  runId: string;
  note: string;
}): Promise<{ ok: boolean }> {
  await prisma.testRun.update({
    where: { id: input.runId },
    data: { devFixNote: input.note.trim() || null },
  });
  revalidatePath(`/admin/runs/${input.runId}`);
  return { ok: true };
}
