import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOpenAI, MODEL } from "@/lib/openai";
import { getSettings, languageInstruction } from "@/lib/settings";

const schema = z.object({
  verdict: z.enum(["improved", "regressed", "neutral"]),
  reason: z.string().min(1),
});

export type ImprovementResult = z.infer<typeof schema>;

function transcript(messages: { role: string; content: string }[]) {
  return messages
    .map((m) => `${m.role === "user" ? "USER" : "BOT"}: ${m.content}`)
    .join("\n");
}

export async function checkImprovement(
  newRunId: string,
): Promise<ImprovementResult> {
  const newRun = await prisma.testRun.findUnique({
    where: { id: newRunId },
    include: {
      testCase: true,
      messages: { orderBy: { createdAt: "asc" } },
      botVersion: { select: { label: true } },
    },
  });
  if (!newRun) throw new Error("New run not found");
  if (!newRun.sourceRunId) throw new Error("No source run to compare against");

  const sourceRun = await prisma.testRun.findUnique({
    where: { id: newRun.sourceRunId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      botVersion: { select: { label: true } },
    },
  });
  if (!sourceRun) throw new Error("Source run not found");

  const messageIds = sourceRun.messages.map((m) => m.id);
  const [runComments, msgComments] = await Promise.all([
    prisma.comment.findMany({
      where: { scope: "run", targetId: sourceRun.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.comment.findMany({
      where: { scope: "message", targetId: { in: messageIds } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const { language } = await getSettings();

  const systemPrompt = `You are an impartial QA reviewer comparing two runs of the SAME test scenario against two versions of a chatbot.

LANGUAGE: ${languageInstruction(language)} Your "reason" field MUST be written in that language.

You will be given:
- The test scenario (persona, goal, success criteria)
- OLD bot version transcript + client verdict + client comments
- NEW bot version transcript

Decide:
- verdict: "improved" if the new version handles the same intent better and fixes issues the client flagged. "regressed" if it does worse or introduces new problems. "neutral" if the change is minor or inconclusive.
- reason: 2-4 sentences citing concrete differences. Reference specific turns when useful.

Respond ONLY with JSON matching the provided schema.`;

  const tcLine = newRun.testCase
    ? `\nTEST SCENARIO\n- Persona: ${newRun.testCase.persona}\n- Goal: ${newRun.testCase.goal}\n- Success criteria: ${newRun.testCase.successCriteria}`
    : "";

  const userPrompt = `${tcLine}

OLD VERSION (${sourceRun.botVersion?.label ?? "unknown"})
Client verdict: ${sourceRun.clientVerdict ?? "(not set)"}
${
    runComments.length
      ? `Client comments on the run:\n${runComments.map((c) => `- ${c.content}`).join("\n")}\n`
      : ""
  }${
    msgComments.length
      ? `Client comments on messages:\n${msgComments.map((c) => `- ${c.content}`).join("\n")}\n`
      : ""
  }Transcript:
${transcript(sourceRun.messages) || "(empty)"}

NEW VERSION (${newRun.botVersion?.label ?? "unknown"})
Transcript:
${transcript(newRun.messages) || "(empty)"}`;

  const openai = await getOpenAI();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "improvement_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            verdict: {
              type: "string",
              enum: ["improved", "regressed", "neutral"],
            },
            reason: { type: "string" },
          },
          required: ["verdict", "reason"],
        },
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Improvement check returned empty response");
  const parsed = schema.parse(JSON.parse(raw));

  await prisma.testRun.update({
    where: { id: newRunId },
    data: {
      improvementVerdict: parsed.verdict,
      improvementReason: parsed.reason,
    },
  });
  return parsed;
}
