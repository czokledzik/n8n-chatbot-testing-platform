"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { executeRun } from "@/lib/run-engine";

export async function runTestCase(testCaseId: string): Promise<never> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { knowledge: { select: { clientId: true } } },
  });
  if (!testCase) throw new Error("Test case not found");

  const run = await prisma.testRun.create({
    data: {
      testCaseId,
      clientId: testCase.knowledge.clientId,
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

  const cases = await prisma.testCase.findMany({
    where: { knowledgeId },
    select: { id: true },
  });

  for (const tc of cases) {
    const run = await prisma.testRun.create({
      data: {
        testCaseId: tc.id,
        clientId: knowledge.clientId,
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
