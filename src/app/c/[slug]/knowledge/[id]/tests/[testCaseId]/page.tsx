import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { RunStatusBadge } from "@/components/run-status-badge";
import {
  ClientVerdictBadge,
  IssueTagsDisplay,
} from "@/components/issue-tags-display";

function formatDuration(start: Date, end: Date | null) {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default async function ClientTestCaseDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string; testCaseId: string }>;
}) {
  const { slug, id, testCaseId } = await params;
  const client = await requireClient(slug);

  const testCase = await prisma.testCase.findFirst({
    where: { id: testCaseId, knowledgeId: id, knowledge: { clientId: client.id } },
    include: {
      knowledge: { select: { id: true, title: true } },
      runs: {
        orderBy: { startedAt: "desc" },
        include: {
          botVersion: { select: { id: true, label: true, isActive: true } },
          _count: { select: { messages: true } },
        },
      },
    },
  });
  if (!testCase) notFound();

  const versions = await prisma.botVersion.findMany({
    where: { clientId: client.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, isActive: true },
  });

  // Group runs by botVersionId (put "no version" at end)
  const byVersion = new Map<string, typeof testCase.runs>();
  for (const r of testCase.runs) {
    const k = r.botVersionId ?? "__none__";
    if (!byVersion.has(k)) byVersion.set(k, []);
    byVersion.get(k)!.push(r);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/c/${slug}/knowledge/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {testCase.knowledge.title}
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-display font-semibold tracking-tight">
          {testCase.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          From{" "}
          <Link
            href={`/c/${slug}/knowledge/${testCase.knowledge.id}`}
            className="hover:underline"
          >
            {testCase.knowledge.title}
          </Link>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scenario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/70 mb-1">
              Persona
            </div>
            <p className="text-muted-foreground">{testCase.persona}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/70 mb-1">
              Goal
            </div>
            <p className="text-muted-foreground">{testCase.goal}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/70 mb-1">
              Success criteria
            </div>
            <p className="text-muted-foreground">{testCase.successCriteria}</p>
          </div>
        </CardContent>
      </Card>

      {versions.length === 0 && testCase.runs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-10">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No runs yet</CardTitle>
            <CardDescription>
              The admin hasn&apos;t executed this test case yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Runs by bot version</CardTitle>
            <CardDescription>
              Compare how each version of the bot handles this scenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {versions.map((v) => {
              const vRuns = byVersion.get(v.id) ?? [];
              return (
                <VersionBlock
                  key={v.id}
                  slug={slug}
                  label={v.label}
                  isActive={v.isActive}
                  runs={vRuns}
                />
              );
            })}
            {byVersion.has("__none__") && (
              <VersionBlock
                slug={slug}
                label="Unversioned"
                isActive={false}
                runs={byVersion.get("__none__") ?? []}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VersionBlock({
  slug,
  label,
  isActive,
  runs,
}: {
  slug: string;
  label: string;
  isActive: boolean;
  runs: {
    id: string;
    status: string;
    clientVerdict: string | null;
    issueTags: string[];
    startedAt: Date;
    finishedAt: Date | null;
    _count: { messages: number };
  }[];
}) {
  return (
    <div className="rounded-md border bg-background/40 backdrop-blur-sm">
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-muted/30">
        <span className="font-mono text-xs font-semibold">{label}</span>
        {isActive && (
          <Badge className="verdict-pass backdrop-blur-sm text-[10px] h-4 px-1.5">
            active
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {runs.length} run{runs.length === 1 ? "" : "s"}
        </span>
      </div>
      {runs.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          Not tested on this version yet.
        </div>
      ) : (
        <ul className="divide-y">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/c/${slug}/runs/${r.id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RunStatusBadge status={r.status} verdict={null} />
                    <ClientVerdictBadge verdict={r.clientVerdict} />
                    <IssueTagsDisplay tags={r.issueTags} size="xs" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r._count.messages} msg ·{" "}
                    {formatDuration(r.startedAt, r.finishedAt)} ·{" "}
                    {r.startedAt.toLocaleString()}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
