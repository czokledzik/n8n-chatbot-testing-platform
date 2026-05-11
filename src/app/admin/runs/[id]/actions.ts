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
