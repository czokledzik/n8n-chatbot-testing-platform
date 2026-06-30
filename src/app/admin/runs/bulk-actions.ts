"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { analyzeBatch } from "@/lib/batch-analysis";

export async function bulkMarkFixed(input: {
  runIds: string[];
  fixed: boolean;
}): Promise<{ ok: boolean; count: number }> {
  if (input.runIds.length === 0) return { ok: true, count: 0 };
  const result = await prisma.testRun.updateMany({
    where: { id: { in: input.runIds } },
    data: { devFixedAt: input.fixed ? new Date() : null },
  });
  revalidatePath("/admin/runs");
  return { ok: true, count: result.count };
}

export async function bulkAnalyze(input: {
  runIds: string[];
  title: string;
}): Promise<never> {
  if (input.runIds.length === 0) throw new Error("No runs selected");

  const runs = await prisma.testRun.findMany({
    where: { id: { in: input.runIds } },
    select: { clientId: true },
  });
  const clientIds = new Set(
    runs.map((r) => r.clientId).filter((id): id is string => Boolean(id)),
  );
  if (clientIds.size !== 1) {
    throw new Error(
      `Batch analysis needs runs from exactly one client (got ${clientIds.size})`,
    );
  }
  const clientId = [...clientIds][0];

  const { reportId } = await analyzeBatch({
    runIds: input.runIds,
    title: input.title,
    clientId,
  });

  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/analyses/${reportId}`);
}
