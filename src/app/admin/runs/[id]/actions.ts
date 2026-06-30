"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { judgeRun } from "@/lib/judge";

export async function rejudge(runId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await judgeRun(runId);
    revalidatePath(`/admin/runs/${runId}`);
    revalidatePath("/admin/runs");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteRun(runId: string): Promise<{ ok: boolean }> {
  await prisma.testRun.delete({ where: { id: runId } });
  revalidatePath("/admin/runs");
  revalidatePath("/admin");
  return { ok: true };
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

export async function bulkSetDevFixed(input: {
  runIds: string[];
  fixed: boolean;
}): Promise<{ ok: boolean; count: number }> {
  const result = await prisma.testRun.updateMany({
    where: { id: { in: input.runIds } },
    data: { devFixedAt: input.fixed ? new Date() : null },
  });
  revalidatePath("/admin/runs");
  return { ok: true, count: result.count };
}
