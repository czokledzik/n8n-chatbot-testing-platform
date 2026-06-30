import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOpenAI, MODEL } from "@/lib/openai";
import { getSettings, languageInstruction } from "@/lib/settings";
import { BATCH_ANALYSIS_MAX, labelForTag } from "@/lib/constants";

const clusterSchema = z.object({
  label: z.string().min(1),
  summary: z.string().min(1),
  runIds: z.array(z.string()).min(1),
  examples: z.array(z.string()).default([]),
});

const schema = z.object({
  clusters: z.array(clusterSchema).min(0),
  overallTakeaways: z.string().min(1),
});

export type BatchAnalysisResult = z.infer<typeof schema>;

function trim(content: string, max: number) {
  return content.length > max ? content.slice(0, max) + "…" : content;
}

export async function analyzeBatch(input: {
  runIds: string[];
  title: string;
  clientId: string;
}): Promise<{ reportId: string; result: BatchAnalysisResult }> {
  if (input.runIds.length === 0) throw new Error("No runs selected");
  if (input.runIds.length > BATCH_ANALYSIS_MAX)
    throw new Error(`Too many runs — max ${BATCH_ANALYSIS_MAX}`);

  const runs = await prisma.testRun.findMany({
    where: { id: { in: input.runIds }, clientId: input.clientId },
    include: {
      testCase: { select: { title: true, goal: true } },
      botVersion: { select: { label: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (runs.length === 0) throw new Error("No matching runs for this client");

  const messageIds = runs.flatMap((r) => r.messages.map((m) => m.id));
  const runComments = await prisma.comment.findMany({
    where: {
      OR: [
        { scope: "run", targetId: { in: runs.map((r) => r.id) } },
        { scope: "message", targetId: { in: messageIds } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const commentsByRun = new Map<string, string[]>();
  for (const c of runComments) {
    let runId: string | undefined;
    if (c.scope === "run") runId = c.targetId;
    else {
      const msg = runs
        .flatMap((r) => r.messages.map((m) => ({ runId: r.id, id: m.id })))
        .find((m) => m.id === c.targetId);
      runId = msg?.runId;
    }
    if (!runId) continue;
    if (!commentsByRun.has(runId)) commentsByRun.set(runId, []);
    commentsByRun.get(runId)!.push(c.content);
  }

  const { language } = await getSettings();

  const systemPrompt = `You are a QA analyst clustering issues across multiple chatbot test runs.

LANGUAGE: ${languageInstruction(language)} ALL output text MUST be in that language.

You will receive a batch of runs with transcripts, client verdicts, issue tags and client comments. Group them into 2-6 clusters of related problems and provide:
- label: short cluster name
- summary: 2-3 sentences describing the common pattern
- runIds: which of the provided run IDs belong to this cluster (use the IDs exactly as given)
- examples: 1-3 short quotes from the transcripts illustrating the issue

Also provide overallTakeaways (3-5 sentences with the most actionable insights for the dev).

If runs are mostly clean (no clear patterns), return an empty clusters array and explain in overallTakeaways.

Respond ONLY with JSON matching the schema.`;

  const runBlocks = runs
    .map((r) => {
      const cmts = commentsByRun.get(r.id) ?? [];
      const transcript = r.messages
        .map((m) => `${m.role === "user" ? "U" : "B"}: ${trim(m.content, 400)}`)
        .join("\n");
      return `RUN ${r.id}
Test case: ${r.testCase?.title ?? "(live chat)"}${r.testCase ? ` — goal: ${trim(r.testCase.goal, 200)}` : ""}
Bot version: ${r.botVersion?.label ?? "unknown"}
Client verdict: ${r.clientVerdict ?? "(not set)"}
Issue tags: ${r.issueTags.length ? r.issueTags.map(labelForTag).join(", ") : "(none)"}
${cmts.length ? `Client comments:\n${cmts.map((c) => `- ${trim(c, 300)}`).join("\n")}\n` : ""}Transcript:
${transcript || "(empty)"}`;
    })
    .join("\n\n---\n\n");

  const openai = await getOpenAI();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "batch_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            clusters: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  summary: { type: "string" },
                  runIds: { type: "array", items: { type: "string" } },
                  examples: { type: "array", items: { type: "string" } },
                },
                required: ["label", "summary", "runIds", "examples"],
              },
            },
            overallTakeaways: { type: "string" },
          },
          required: ["clusters", "overallTakeaways"],
        },
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: runBlocks },
    ],
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Batch analysis returned empty response");
  const result = schema.parse(JSON.parse(raw));

  const report = await prisma.analysisReport.create({
    data: {
      clientId: input.clientId,
      scope: "batch",
      title: input.title,
      inputRunIds: runs.map((r) => r.id),
      resultJson: JSON.stringify(result),
    },
  });

  return { reportId: report.id, result };
}
