import "server-only";
import { prisma } from "@/lib/db";
import type { VersionEntry } from "@/components/version-switcher";
export type { VersionStatus } from "@/components/version-status-pills";
import type { VersionStatus } from "@/components/version-status-pills";

/**
 * Batch: for each test case, resolve the latest run per bot version.
 * Returns { [testCaseId]: VersionStatus[] } — ordered by version.
 * Untested (versionId, testCaseId) pairs get runId=null.
 */
export async function versionStatusForTestCases(input: {
  clientId: string;
  testCaseIds: string[];
}): Promise<Record<string, VersionStatus[]>> {
  if (input.testCaseIds.length === 0) return {};

  const versions = await prisma.botVersion.findMany({
    where: { clientId: input.clientId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, isActive: true },
  });

  const runs = await prisma.testRun.findMany({
    where: {
      testCaseId: { in: input.testCaseIds },
      clientId: input.clientId,
      botVersionId: { not: null },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      testCaseId: true,
      botVersionId: true,
      status: true,
      clientVerdict: true,
    },
  });

  // latest per (testCaseId, botVersionId)
  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) {
    const key = `${r.testCaseId}|${r.botVersionId}`;
    if (!latest.has(key)) latest.set(key, r);
  }

  const result: Record<string, VersionStatus[]> = {};
  for (const tcId of input.testCaseIds) {
    result[tcId] = versions.map((v) => {
      const run = latest.get(`${tcId}|${v.id}`);
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
  return result;
}

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
