import Link from "next/link";
import { ArrowRight, FlaskConical, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { RunStatusBadge } from "@/components/run-status-badge";
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";
import { FilterTabs } from "./filter-tabs";

type Filter =
  | "all"
  | "passed"
  | "failed"
  | "hallucinations"
  | "errors"
  | "active";

function formatDuration(start: Date, end: Date | null) {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

function whereForFilter(filter: Filter) {
  switch (filter) {
    case "passed":
      return { status: "done", verdict: "pass" };
    case "failed":
      return { status: "done", verdict: "fail" };
    case "hallucinations":
      return { hallucination: true };
    case "errors":
      return { status: "error" };
    case "active":
      return { status: { in: ["pending", "running"] } };
    default:
      return {};
  }
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const allowed: Filter[] = [
    "all",
    "passed",
    "failed",
    "hallucinations",
    "errors",
    "active",
  ];
  const filter: Filter = (allowed as string[]).includes(sp.filter ?? "all")
    ? (sp.filter as Filter)
    : "all";

  const [runs, counts] = await Promise.all([
    prisma.testRun.findMany({
      where: whereForFilter(filter),
      orderBy: { startedAt: "desc" },
      include: {
        testCase: { select: { title: true, id: true } },
        _count: { select: { messages: true } },
      },
      take: 100,
    }),
    Promise.all([
      prisma.testRun.count(),
      prisma.testRun.count({ where: { status: "done", verdict: "pass" } }),
      prisma.testRun.count({ where: { status: "done", verdict: "fail" } }),
      prisma.testRun.count({ where: { hallucination: true } }),
      prisma.testRun.count({ where: { status: "error" } }),
      prisma.testRun.count({
        where: { status: { in: ["pending", "running"] } },
      }),
    ]).then(([all, passed, failed, hallucinations, errors, active]) => ({
      all,
      passed,
      failed,
      hallucinations,
      errors,
      active,
    })),
  ]);

  const hasActive = counts.active > 0;

  return (
    <div className="space-y-8">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={hasActive} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Test Runs</h1>
        <p className="text-muted-foreground">
          {counts.all === 0
            ? "No runs yet."
            : `${counts.all} total · ${hasActive ? "live updating" : "idle"}`}
        </p>
      </header>

      {counts.all > 0 && <FilterTabs counts={counts} />}

      {counts.all === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No test runs yet</CardTitle>
            <CardDescription>
              Trigger a run from a test case.
            </CardDescription>
            <div className="pt-4">
              <Link href="/admin/tests" className={buttonVariants()}>
                <FlaskConical className="h-4 w-4" />
                Open Test Cases
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : runs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-10">
            <CardTitle className="text-base">No runs match this filter</CardTitle>
            <CardDescription>
              Try a different category from the tabs above.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/admin/runs/${run.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RunStatusBadge
                          status={run.status}
                          verdict={run.verdict}
                        />
                        {run.hallucination ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
                          >
                            Hallucination
                          </Badge>
                        ) : null}
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
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
