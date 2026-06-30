"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { executeRun } from "@/lib/run-engine";

async function activeVersionFor(clientId: string | null) {
  if (!clientId) return null;
  return prisma.botVersion.findFirst({
    where: { clientId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export async function runTestCase(testCaseId: string): Promise<never> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { knowledge: { select: { clientId: true } } },
  });
  if (!testCase) throw new Error("Test case not found");

  const version = await activeVersionFor(testCase.knowledge.clientId);

  const run = await prisma.testRun.create({
    data: {
      testCaseId,
      clientId: testCase.knowledge.clientId,
      botVersionId: version?.id ?? null,
      source: "test",
      status: "pending",
    },
  });

  void executeRun(run.id);

  revalidatePath("/admin/runs");
  revalidatePath("/admin/tests");
  revalidatePath(`/admin/knowledge/${testCase.knowledgeId}`);
  redirect(`/admin/runs/${run.id}`);
}

export async function runAllForKnowledge(
  knowledgeId: string,
): Promise<{ ok: true; count: number }> {
  const knowledge = await prisma.knowledge.findUnique({
    where: { id: knowledgeId },
    select: { clientId: true },
  });
  if (!knowledge) throw new Error("Knowledge not found");

  const version = await activeVersionFor(knowledge.clientId);

  const cases = await prisma.testCase.findMany({
    where: { knowledgeId },
    select: { id: true },
  });

  for (const tc of cases) {
    const run = await prisma.testRun.create({
      data: {
        testCaseId: tc.id,
        clientId: knowledge.clientId,
        botVersionId: version?.id ?? null,
        source: "test",
        status: "pending",
      },
    });
    void executeRun(run.id);
  }

  revalidatePath("/admin/runs");
  revalidatePath(`/admin/knowledge/${knowledgeId}`);
  return { ok: true, count: cases.length };
}

export async function reRunOnVersion(input: {
  sourceRunId: string;
  botVersionId: string;
}): Promise<never> {
  const sourceRun = await prisma.testRun.findUnique({
    where: { id: input.sourceRunId },
    include: { testCase: true },
  });
  if (!sourceRun) throw new Error("Source run not found");
  if (!sourceRun.testCase) throw new Error("Source run has no test case");

  const version = await prisma.botVersion.findUnique({
    where: { id: input.botVersionId },
    select: { id: true, clientId: true },
  });
  if (!version) throw new Error("Bot version not found");
  if (version.clientId !== sourceRun.clientId)
    throw new Error("Bot version does not belong to this client");

  const newRun = await prisma.testRun.create({
    data: {
      testCaseId: sourceRun.testCaseId,
      clientId: sourceRun.clientId,
      botVersionId: version.id,
      sourceRunId: sourceRun.id,
      source: "test",
      status: "pending",
    },
  });

  void executeRun(newRun.id);

  revalidatePath("/admin/runs");
  revalidatePath(`/admin/runs/${sourceRun.id}`);
  redirect(`/admin/runs/${newRun.id}`);
}
