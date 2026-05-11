import "server-only";
import { prisma } from "@/lib/db";
import { callN8nWebhook } from "@/lib/n8n";
import { nextUserMessage, type ChatTurn } from "@/lib/simulator";
import { judgeRun } from "@/lib/judge";
import { MAX_TURNS } from "@/lib/constants";

export async function executeRun(runId: string): Promise<void> {
  await prisma.testRun.update({
    where: { id: runId },
    data: { status: "running" },
  });

  try {
    const run = await prisma.testRun.findUnique({
      where: { id: runId },
      include: { testCase: true },
    });
    if (!run) throw new Error(`Run ${runId} not found`);
    if (!run.testCase) throw new Error(`Run ${runId} has no test case`);

    const testCase = run.testCase;
    const history: ChatTurn[] = [];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const userTurn = await nextUserMessage(testCase, history);

      await prisma.message.create({
        data: {
          testRunId: runId,
          role: "user",
          content: userTurn.message,
        },
      });
      history.push({ role: "user", content: userTurn.message });

      let botReply: string;
      try {
        botReply = await callN8nWebhook(userTurn.message, runId, {
          clientId: run.clientId,
        });
      } catch (err) {
        await prisma.message.create({
          data: {
            testRunId: runId,
            role: "bot",
            content: `[webhook error: ${(err as Error).message}]`,
          },
        });
        throw err;
      }

      await prisma.message.create({
        data: {
          testRunId: runId,
          role: "bot",
          content: botReply,
        },
      });
      history.push({ role: "bot", content: botReply });

      if (userTurn.done) break;
    }

    try {
      await judgeRun(runId);
    } catch (err) {
      await prisma.testRun.update({
        where: { id: runId },
        data: { judgeReason: `Judge error: ${(err as Error).message}` },
      });
    }

    await prisma.testRun.update({
      where: { id: runId },
      data: { status: "done", finishedAt: new Date() },
    });
  } catch (err) {
    await prisma.testRun.update({
      where: { id: runId },
      data: {
        status: "error",
        finishedAt: new Date(),
        judgeReason: (err as Error).message.slice(0, 500),
      },
    });
  }
}
