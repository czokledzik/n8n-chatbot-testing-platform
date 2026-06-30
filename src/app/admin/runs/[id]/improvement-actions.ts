"use server";

import { revalidatePath } from "next/cache";
import { checkImprovement } from "@/lib/improvement";

export async function runImprovementCheck(
  runId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkImprovement(runId);
    revalidatePath(`/admin/runs/${runId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
