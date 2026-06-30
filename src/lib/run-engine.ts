import "server-only";
import { prisma } from "@/lib/db";
import { callN8nWebhook } from "@/lib/n8n";
import {
  nextUserMessage,
  type ChatTurn,
  type ReplayContext,
} from "@/lib/simulator";
import { MAX_TURNS } from "@/lib/constants";

async function loadReplayContext(
  sourceRunId: string,
): Promise<ReplayContext | undefined> {
  const sourceRun = await prisma.testRun.findUnique({
    where: { id: sourceRunId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!sourceRun) return undefined;

  const previousUserTurns = sourceRun.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  const messageIds = sourceRun.messages.map((m) => m.id);

  const [runComments, msgComments] = await Promise.all([
    prisma.comment.findMany({
      where: { scope: "run", targetId: sourceRunId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.comment.findMany({
      where: { scope: "message", targetId: { in: messageIds } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const msgById = new Map(sourceRun.messages.map((m) => [m.id, m]));

  return {
    previousUserTurns,
    runComments: runComments.map((c) => c.content),
    messageComments: msgComments.flatMap((c) => {
      const target = msgById.get(c.targetId);
      if (!target) return [];
      return [
        {
          role: target.role === "user" ? "user" : "bot",
          content: target.content,
          comment: c.content,
        } as const,
      ];
    }),
  };
}

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

    const replay = run.sourceRunId
      ? await loadReplayContext(run.sourceRunId)
      : undefined;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const userTurn = await nextUserMessage(testCase, history, replay);

      await prisma.message.create({
        data: {
          testRunId: runId,
          role: "user",
          content: userTurn.message,
        },
      });
      history.push({ role: "user", content: userTurn.message });

      let botReply: string;
      let responseTimeMs: number | null = null;
      try {
        const result = await callN8nWebhook(userTurn.message, runId, {
          clientId: run.clientId,
          botVersionId: run.botVersionId,
        });
        botReply = result.output;
        responseTimeMs = result.responseTimeMs;
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
          responseTimeMs,
        },
      });
      history.push({ role: "bot", content: botReply });

      if (userTurn.done) break;
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
