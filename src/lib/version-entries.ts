import "server-only";
import { prisma } from "@/lib/db";
import type { VersionEntry } from "@/components/version-switcher";

/**
 * For a given TestCase, gather one representative TestRun per BotVersion of
 * the client. Latest run wins if multiple. Versions without a run get null.
 */
export async function versionEntriesForTestCase(input: {
  clientId: string;
  testCaseId: string;
}): Promise<VersionEntry[]> {
  const versions = await prisma.botVersion.findMany({
    where: { clientId: input.clientId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, isActive: true },
  });

  if (versions.length === 0) return [];

  const runs = await prisma.testRun.findMany({
    where: {
      testCaseId: input.testCaseId,
      clientId: input.clientId,
      botVersionId: { in: versions.map((v) => v.id) },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      botVersionId: true,
      status: true,
      clientVerdict: true,
    },
  });

  const latestByVersion = new Map<string, (typeof runs)[number]>();
  for (const r of runs) {
    if (!r.botVersionId) continue;
    if (!latestByVersion.has(r.botVersionId)) {
      latestByVersion.set(r.botVersionId, r);
    }
  }

  return versions.map((v) => {
    const run = latestByVersion.get(v.id);
    return {
      versionId: v.id,
      label: v.label,
      isActive: v.isActive,
      runId: run?.id ?? null,
      status: run?.status ?? null,
      clientVerdict: run?.clientVerdict ?? null,
    };
  });
}
