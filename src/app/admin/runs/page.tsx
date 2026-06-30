import Link from "next/link";
import { FlaskConical, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";
import { FilterTabs } from "./filter-tabs";
import { RunsTable, type RunRow } from "./table-view";

type Filter =
  | "all"
  | "passed"
  | "failed"
  | "needs-review"
  | "fixed"
  | "errors"
  | "active";

function whereForFilter(filter: Filter) {
  switch (filter) {
    case "passed":
      return { clientVerdict: "pass" };
    case "failed":
      return { clientVerdict: "fail" };
    case "needs-review":
      return { clientVerdict: "needs-review" };
    case "fixed":
      return { devFixedAt: { not: null } };
    case "errors":
      return { status: "error" };
    case "active":
      return { status: { in: ["pending", "running"] } };
    default:
      return {};
  }
}

function avg(nums: (number | null)[]) {
  const ok = nums.filter((n): n is number => typeof n === "number");
  if (ok.length === 0) return null;
  return Math.round(ok.reduce((a, b) => a + b, 0) / ok.length);
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const allowed: Filter[] = [
    "all",
    "passed",
    "failed",
    "needs-review",
    "fixed",
    "errors",
    "active",
  ];
  const filter: Filter = (allowed as string[]).includes(sp.filter ?? "all")
    ? (sp.filter as Filter)
    : "all";

  const filterWhere = whereForFilter(filter);
  const clientWhere = sp.client ? { clientId: sp.client } : {};
  const where = { ...filterWhere, ...clientWhere };

  const [runs, counts, clients] = await Promise.all([
    prisma.testRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        testCase: { select: { title: true } },
        client: { select: { name: true, slug: true } },
        botVersion: { select: { label: true } },
        messages: { select: { responseTimeMs: true } },
      },
      take: 200,
    }),
    Promise.all([
      prisma.testRun.count({ where: clientWhere }),
      prisma.testRun.count({ where: { ...clientWhere, clientVerdict: "pass" } }),
      prisma.testRun.count({ where: { ...clientWhere, clientVerdict: "fail" } }),
      prisma.testRun.count({
        where: { ...clientWhere, clientVerdict: "needs-review" },
      }),
      prisma.testRun.count({
        where: { ...clientWhere, devFixedAt: { not: null } },
      }),
      prisma.testRun.count({ where: { ...clientWhere, status: "error" } }),
      prisma.testRun.count({
        where: { ...clientWhere, status: { in: ["pending", "running"] } },
      }),
    ]).then(([all, passed, failed, needsReview, fixed, errors, active]) => ({
      all,
      passed,
      failed,
      "needs-review": needsReview,
      fixed,
      errors,
      active,
    })),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hasActive = counts.active > 0;

  const rows: RunRow[] = runs.map((r) => ({
    id: r.id,
    status: r.status,
    clientVerdict: r.clientVerdict,
    devFixedAt: r.devFixedAt,
    botVersionLabel: r.botVersion?.label ?? null,
    testCaseTitle: r.testCase?.title ?? null,
    clientName: r.client?.name ?? null,
    clientSlug: r.client?.slug ?? null,
    messageCount: r.messages.length,
    avgResponseMs: avg(r.messages.map((m) => m.responseTimeMs)),
    issueTags: r.issueTags,
    source: r.source,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  }));

  return (
    <div className="space-y-6">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={hasActive} />

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            {counts.all === 0
              ? "No runs yet."
              : `${counts.all} total · ${hasActive ? "live updating" : "idle"}`}
          </p>
        </div>
        {counts.all > 0 && (
          <div className="flex gap-2 text-sm">
            <a
              href={`/admin/export/runs.csv${sp.client ? `?clientId=${sp.client}` : ""}`}
              className="text-primary hover:underline"
              download
            >
              Export CSV
            </a>
            <span className="text-muted-foreground">·</span>
            <a
              href={`/admin/export/runs.json${sp.client ? `?clientId=${sp.client}` : ""}`}
              className="text-primary hover:underline"
              download
            >
              JSON
            </a>
          </div>
        )}
      </header>

      {counts.all > 0 && (
        <div className="space-y-2">
          <FilterTabs counts={counts} />
          {clients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Client:</span>
              <ClientFilter clients={clients} active={sp.client ?? null} filter={filter} />
            </div>
          )}
        </div>
      )}

      {counts.all === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No test runs yet</CardTitle>
            <CardDescription>Trigger a run from a test case.</CardDescription>
            <div className="pt-4">
              <Link href="/admin/tests" className={buttonVariants()}>
                <FlaskConical className="h-4 w-4" />
                Open Test Cases
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <RunsTable rows={rows} />
      )}
    </div>
  );
}

function ClientFilter({
  clients,
  active,
  filter,
}: {
  clients: { id: string; name: string }[];
  active: string | null;
  filter: string;
}) {
  const base = filter === "all" ? "" : `filter=${filter}`;
  return (
    <>
      <Link
        href={`/admin/runs${base ? "?" + base : ""}`}
        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
          active === null
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        All
      </Link>
      {clients.map((c) => {
        const isActive = active === c.id;
        const params = new URLSearchParams();
        if (filter !== "all") params.set("filter", filter);
        params.set("client", c.id);
        return (
          <Link
            key={c.id}
            href={`/admin/runs?${params.toString()}`}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.name}
          </Link>
        );
      })}
    </>
  );
}
