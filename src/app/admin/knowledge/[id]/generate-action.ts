"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOpenAI, MODEL } from "@/lib/openai";
import { getSettings, languageInstruction } from "@/lib/settings";

const caseSchema = z.object({
  title: z.string().min(1).max(120),
  persona: z.string().min(1),
  goal: z.string().min(1),
  successCriteria: z.string().min(1),
});

const responseSchema = z.object({
  cases: z.array(caseSchema),
});

export type GenerateState = {
  ok: boolean;
  count?: number;
  error?: string;
};

export async function generateTestCases(
  knowledgeId: string,
  count: number,
): Promise<GenerateState> {
  if (![3, 5, 10].includes(count)) {
    return { ok: false, error: "Invalid count (must be 3, 5 or 10)" };
  }

  const knowledge = await prisma.knowledge.findUnique({
    where: { id: knowledgeId },
  });
  if (!knowledge) return { ok: false, error: "Knowledge not found" };

  let openai;
  try {
    openai = await getOpenAI();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const { language } = await getSettings();

  const systemPrompt = `You are a senior QA engineer designing adversarial and realistic test scenarios for a chatbot.
The chatbot is grounded in the knowledge text provided by the user. Your scenarios will be used to drive multi-turn conversations between a simulated user and the bot, then auto-judged.

LANGUAGE: ${languageInstruction(language)} The fields title, persona, goal and successCriteria MUST be written in that language.

For each scenario produce:
- title: short label (max 12 words)
- persona: who the simulated user is (1-2 sentences, include relevant traits)
- goal: what the user wants from the bot (concrete, single intent)
- successCriteria: how to decide if the conversation succeeded (objective, references the knowledge)

Mix easy, ambiguous and edge-case scenarios. Include at least one where the user asks something OUTSIDE the knowledge to probe hallucinations.
Respond ONLY with JSON matching the provided schema. Generate exactly ${count} cases.`;

  const userPrompt = `KNOWLEDGE TITLE: ${knowledge.title}\n\nKNOWLEDGE CONTENT:\n${knowledge.content}`;

  let parsed: z.infer<typeof responseSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_cases",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              cases: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    persona: { type: "string" },
                    goal: { type: "string" },
                    successCriteria: { type: "string" },
                  },
                  required: ["title", "persona", "goal", "successCriteria"],
                },
              },
            },
            required: ["cases"],
          },
        },
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message.content;
    if (!raw) return { ok: false, error: "Empty response from OpenAI" };
    parsed = responseSchema.parse(JSON.parse(raw));
  } catch (err) {
    return { ok: false, error: `OpenAI error: ${(err as Error).message}` };
  }

  const cases = parsed.cases.slice(0, count);
  await prisma.testCase.createMany({
    data: cases.map((c) => ({
      knowledgeId,
      title: c.title,
      persona: c.persona,
      goal: c.goal,
      successCriteria: c.successCriteria,
    })),
  });

  revalidatePath(`/admin/knowledge/${knowledgeId}`);
  revalidatePath("/admin/tests");
  revalidatePath("/admin");
  return { ok: true, count: cases.length };
}
