import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOpenAI, MODEL } from "@/lib/openai";
import { getSettings, languageInstruction } from "@/lib/settings";

const responseSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  hallucination: z.boolean(),
  reason: z.string().min(1),
});

export type JudgeResult = z.infer<typeof responseSchema>;

export async function judgeRun(runId: string): Promise<JudgeResult> {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      testCase: { include: { knowledge: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!run) throw new Error(`Run ${runId} not found`);
  if (!run.testCase)
    throw new Error("Cannot judge a live chat run (no test case)");

  const testCase = run.testCase;
  const transcript = run.messages
    .map(
      (m) => `${m.role === "user" ? "USER" : "BOT"}: ${m.content}`,
    )
    .join("\n");

  const { language } = await getSettings();

  const systemPrompt = `You are an impartial QA judge evaluating a chatbot conversation.

LANGUAGE: ${languageInstruction(language)} Your "reason" field MUST be written in that language.

You will be given:
- The reference KNOWLEDGE the bot is grounded in
- The TEST SCENARIO (persona, goal, success criteria)
- The full TRANSCRIPT

Decide:
- verdict: "pass" if the bot achieved the user's goal AND meets the success criteria. Otherwise "fail".
- hallucination: true if the bot stated factual information that is NOT supported by the knowledge AND is not a plain refusal/"I don't know". Refusing to answer questions outside the knowledge is NOT a hallucination.
- reason: 1-3 sentences explaining the verdict, citing specific bot turns.

Be strict but fair. Respond ONLY with JSON matching the schema.`;

  const userPrompt = `KNOWLEDGE:
${testCase.knowledge.content}

TEST SCENARIO
- Persona: ${testCase.persona}
- Goal: ${testCase.goal}
- Success criteria: ${testCase.successCriteria}

TRANSCRIPT:
${transcript || "(empty)"}`;

  const openai = await getOpenAI();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "judge_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            verdict: { type: "string", enum: ["pass", "fail"] },
            hallucination: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["verdict", "hallucination", "reason"],
        },
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Judge returned empty response");
  const parsed = responseSchema.parse(JSON.parse(raw));

  await prisma.testRun.update({
    where: { id: runId },
    data: {
      verdict: parsed.verdict,
      hallucination: parsed.hallucination,
      judgeReason: parsed.reason,
    },
  });

  return parsed;
}
