import "server-only";
import { prisma } from "@/lib/db";
import { labelForTag } from "@/lib/constants";

type ExportFilter = {
  clientId?: string | null;
  botVersionId?: string | null;
  runIds?: string[];
};

export async function fetchRunsForExport(filter: ExportFilter) {
  const where: Record<string, unknown> = {};
  if (filter.clientId) where.clientId = filter.clientId;
  if (filter.botVersionId) where.botVersionId = filter.botVersionId;
  if (filter.runIds && filter.runIds.length > 0)
    where.id = { in: filter.runIds };

  return prisma.testRun.findMany({
    where,
    orderBy: { startedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, slug: true } },
      testCase: {
        include: { knowledge: { select: { id: true, title: true } } },
      },
      botVersion: { select: { id: true, label: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

type FullRun = Awaited<ReturnType<typeof fetchRunsForExport>>[number];

function avgResponseMs(messages: FullRun["messages"]): number | null {
  const nums = messages
    .filter((m) => typeof m.responseTimeMs === "number")
    .map((m) => m.responseTimeMs as number);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function runsToCsv(runs: FullRun[]): string {
  const header = [
    "run_id",
    "client",
    "client_slug",
    "knowledge",
    "test_case",
    "bot_version",
    "status",
    "client_verdict",
    "issue_tags",
    "dev_fixed",
    "dev_fix_note",
    "client_verified",
    "improvement_verdict",
    "source",
    "source_run_id",
    "message_count",
    "avg_response_ms",
    "started_at",
    "finished_at",
  ];

  const rows = runs.map((r) =>
    [
      r.id,
      r.client?.name ?? "",
      r.client?.slug ?? "",
      r.testCase?.knowledge?.title ?? "",
      r.testCase?.title ?? "",
      r.botVersion?.label ?? "",
      r.status,
      r.clientVerdict ?? "",
      r.issueTags.map(labelForTag).join("|"),
      r.devFixedAt ? r.devFixedAt.toISOString() : "",
      r.devFixNote ?? "",
      r.clientVerifiedAt ? r.clientVerifiedAt.toISOString() : "",
      r.improvementVerdict ?? "",
      r.source,
      r.sourceRunId ?? "",
      r.messages.length,
      avgResponseMs(r.messages) ?? "",
      r.startedAt.toISOString(),
      r.finishedAt ? r.finishedAt.toISOString() : "",
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export async function runsToJson(runs: FullRun[]) {
  const messageIds = runs.flatMap((r) => r.messages.map((m) => m.id));
  const runIds = runs.map((r) => r.id);
  const comments = await prisma.comment.findMany({
    where: {
      OR: [
        { scope: "run", targetId: { in: runIds } },
        { scope: "message", targetId: { in: messageIds } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  const commentsByMessage = new Map<string, typeof comments>();
  const commentsByRun = new Map<string, typeof comments>();
  for (const c of comments) {
    const map = c.scope === "run" ? commentsByRun : commentsByMessage;
    if (!map.has(c.targetId)) map.set(c.targetId, []);
    map.get(c.targetId)!.push(c);
  }

  return runs.map((r) => ({
    id: r.id,
    client: r.client
      ? { id: r.client.id, name: r.client.name, slug: r.client.slug }
      : null,
    testCase: r.testCase
      ? {
          id: r.testCase.id,
          title: r.testCase.title,
          persona: r.testCase.persona,
          goal: r.testCase.goal,
          successCriteria: r.testCase.successCriteria,
          knowledge: {
            id: r.testCase.knowledge.id,
            title: r.testCase.knowledge.title,
          },
        }
      : null,
    botVersion: r.botVersion
      ? { id: r.botVersion.id, label: r.botVersion.label }
      : null,
    sourceRunId: r.sourceRunId,
    source: r.source,
    status: r.status,
    clientVerdict: r.clientVerdict,
    clientVerifiedAt: r.clientVerifiedAt,
    devFixedAt: r.devFixedAt,
    devFixNote: r.devFixNote,
    issueTags: r.issueTags,
    notes: r.notes,
    improvementVerdict: r.improvementVerdict,
    improvementReason: r.improvementReason,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    avgResponseMs: avgResponseMs(r.messages),
    messages: r.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      responseTimeMs: m.responseTimeMs,
      createdAt: m.createdAt,
      comments: (commentsByMessage.get(m.id) ?? []).map((c) => ({
        author: c.authorScope,
        content: c.content,
        createdAt: c.createdAt,
      })),
    })),
    runComments: (commentsByRun.get(r.id) ?? []).map((c) => ({
      author: c.authorScope,
      content: c.content,
      createdAt: c.createdAt,
    })),
  }));
}

export function runToMarkdown(run: FullRun, commentsByMessage: Map<string, { authorScope: string; content: string }[]>, runComments: { authorScope: string; content: string }[]): string {
  const lines: string[] = [];
  lines.push(`# ${run.testCase?.title ?? "Live conversation"}`);
  lines.push("");
  if (run.client) lines.push(`- **Client:** ${run.client.name}`);
  if (run.botVersion) lines.push(`- **Bot version:** ${run.botVersion.label}`);
  if (run.testCase?.knowledge)
    lines.push(`- **Knowledge:** ${run.testCase.knowledge.title}`);
  lines.push(`- **Source:** ${run.source}`);
  lines.push(`- **Status:** ${run.status}`);
  if (run.clientVerdict)
    lines.push(`- **Client verdict:** ${run.clientVerdict}`);
  if (run.issueTags.length)
    lines.push(
      `- **Issue tags:** ${run.issueTags.map(labelForTag).join(", ")}`,
    );
  if (run.devFixedAt)
    lines.push(`- **Dev fixed at:** ${run.devFixedAt.toISOString()}`);
  if (run.devFixNote) lines.push(`- **Dev fix note:** ${run.devFixNote}`);
  if (run.improvementVerdict)
    lines.push(
      `- **Improvement:** ${run.improvementVerdict} — ${run.improvementReason ?? ""}`,
    );
  const avg = avgResponseMs(run.messages);
  if (avg !== null)
    lines.push(`- **Avg response:** ${(avg / 1000).toFixed(2)}s`);
  lines.push(`- **Started:** ${run.startedAt.toISOString()}`);
  if (run.finishedAt) lines.push(`- **Finished:** ${run.finishedAt.toISOString()}`);
  lines.push("");

  if (run.testCase) {
    lines.push("## Scenario");
    lines.push(`- **Persona:** ${run.testCase.persona}`);
    lines.push(`- **Goal:** ${run.testCase.goal}`);
    lines.push(`- **Success criteria:** ${run.testCase.successCriteria}`);
    lines.push("");
  }

  lines.push("## Conversation");
  lines.push("");
  for (const m of run.messages) {
    const speaker = m.role === "user" ? "User" : "Bot";
    const timing =
      m.responseTimeMs !== null && m.responseTimeMs !== undefined
        ? ` (${(m.responseTimeMs / 1000).toFixed(2)}s)`
        : "";
    lines.push(`### ${speaker}${timing}`);
    lines.push("");
    lines.push(m.content);
    lines.push("");
    const cmts = commentsByMessage.get(m.id) ?? [];
    if (cmts.length > 0) {
      lines.push(`> Comments:`);
      for (const c of cmts) {
        lines.push(`> - **${c.authorScope}**: ${c.content}`);
      }
      lines.push("");
    }
  }

  if (runComments.length > 0) {
    lines.push("## Run comments");
    lines.push("");
    for (const c of runComments) {
      lines.push(`- **${c.authorScope}**: ${c.content}`);
    }
    lines.push("");
  }

  if (run.notes) {
    lines.push("## Notes");
    lines.push("");
    lines.push(run.notes);
    lines.push("");
  }

  return lines.join("\n");
}

export async function fetchRunMarkdown(runId: string) {
  const runs = await fetchRunsForExport({ runIds: [runId] });
  if (runs.length === 0) return null;
  const run = runs[0];
  const messageIds = run.messages.map((m) => m.id);
  const comments = await prisma.comment.findMany({
    where: {
      OR: [
        { scope: "run", targetId: runId },
        { scope: "message", targetId: { in: messageIds } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  const byMsg = new Map<
    string,
    { authorScope: string; content: string }[]
  >();
  const runComments: { authorScope: string; content: string }[] = [];
  for (const c of comments) {
    if (c.scope === "run") {
      runComments.push({ authorScope: c.authorScope, content: c.content });
    } else {
      if (!byMsg.has(c.targetId)) byMsg.set(c.targetId, []);
      byMsg
        .get(c.targetId)!
        .push({ authorScope: c.authorScope, content: c.content });
    }
  }
  return { run, markdown: runToMarkdown(run, byMsg, runComments) };
}
