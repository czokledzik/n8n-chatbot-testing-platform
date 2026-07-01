import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
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
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatDuration(start: Date, end: Date | null) {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default async function ClientRunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await requireClient(slug);
  const groupBy = sp.group === "document" ? "document" : "none";

  const runs = await prisma.testRun.findMany({
    where: { clientId: client.id },
    orderBy: { startedAt: "desc" },
    include: {
      testCase: {
        select: {
          title: true,
          knowledge: { select: { id: true, title: true } },
        },
      },
      botVersion: { select: { label: true } },
      _count: { select: { messages: true } },
    },
    take: 200,
  });

  const hasActive = runs.some(
    (r) => r.status === "pending" || r.status === "running",
  );

  const groups =
    groupBy === "document"
      ? (() => {
          const map = new Map<
            string,
            { title: string; runs: typeof runs }
          >();
          for (const r of runs) {
            const kid = r.testCase?.knowledge?.id ?? "__none__";
            const title = r.testCase?.knowledge?.title ?? "Live chat / no document";
            if (!map.has(kid)) map.set(kid, { title, runs: [] });
            map.get(kid)!.runs.push(r);
          }
          return [...map.entries()].map(([key, v]) => ({
            key,
            title: v.title,
            runs: v.runs,
          }));
        })()
      : null;

  const groupHref = groupBy === "document" ? `/c/${slug}/runs` : `/c/${slug}/runs?group=document`;

  return (
    <div className="space-y-6">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={hasActive} />

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            Automated test executions and your live chat sessions.
          </p>
        </div>
        {runs.length > 0 && (
          <div className="flex gap-2 text-sm items-center">
            <Link
              href={groupHref}
              className={cn(
                "text-primary hover:underline",
                groupBy === "document" && "font-semibold",
              )}
            >
              {groupBy === "document" ? "Ungroup" : "Group by document"}
            </Link>
            <span className="text-muted-foreground">·</span>
            <a
              href={`/c/${slug}/export/runs.csv`}
              className="text-primary hover:underline"
              download
            >
              Export CSV
            </a>
          </div>
        )}
      </header>

      {runs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No runs yet</CardTitle>
            <CardDescription>
              Automated runs will appear here when the admin executes test
              cases. You can also start a live chat session.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : groups ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {g.title}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {g.runs.length} run{g.runs.length === 1 ? "" : "s"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {g.runs.map((run) => (
                    <RunRow key={run.id} slug={slug} run={run} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {runs.map((run) => (
                <RunRow key={run.id} slug={slug} run={run} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Run = Awaited<
  ReturnType<typeof prisma.testRun.findMany<{
    include: {
      testCase: {
        select: {
          title: true;
          knowledge: { select: { id: true; title: true } };
        };
      };
      botVersion: { select: { label: true } };
      _count: { select: { messages: true } };
    };
  }>>
>[number];

function RunRow({ slug, run }: { slug: string; run: Run }) {
  return (
    <li>
      <Link
        href={`/c/${slug}/runs/${run.id}`}
        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <RunStatusBadge status={run.status} verdict={null} />
            <ClientVerdictBadge verdict={run.clientVerdict} />
            {run.botVersion && (
              <Badge
                variant="secondary"
                className="font-mono text-xs backdrop-blur-sm bg-muted/60"
              >
                {run.botVersion.label}
              </Badge>
            )}
            {run.source === "live" && (
              <Badge variant="outline" className="text-xs">
                Live chat
              </Badge>
            )}
            <IssueTagsDisplay tags={run.issueTags} size="xs" />
          </div>
          <div className="font-medium text-sm truncate">
            {run.testCase?.title ?? "Live conversation"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {run._count.messages} messages ·{" "}
            {formatDuration(run.startedAt, run.finishedAt)} ·{" "}
            {run.startedAt.toLocaleString()}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
