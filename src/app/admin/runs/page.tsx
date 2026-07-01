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
import { getScopedClientId } from "@/lib/admin-scope";
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

function buildQuery(base: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    client?: string;
    knowledge?: string;
    group?: string;
  }>;
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
  const groupBy = sp.group === "document" ? "document" : "none";

  const scopedClientId = await getScopedClientId({ client: sp.client });
  const filterWhere = whereForFilter(filter);
  const clientWhere = scopedClientId ? { clientId: scopedClientId } : {};
  const knowledgeWhere = sp.knowledge
    ? { testCase: { knowledgeId: sp.knowledge } }
    : {};
  const where = { ...filterWhere, ...clientWhere, ...knowledgeWhere };

  const [runs, counts, clients, knowledgeList] = await Promise.all([
    prisma.testRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        testCase: {
          select: {
            title: true,
            knowledgeId: true,
            knowledge: { select: { id: true, title: true } },
          },
        },
        client: { select: { name: true, slug: true } },
        botVersion: { select: { label: true } },
        messages: { select: { responseTimeMs: true } },
      },
      take: 200,
    }),
    Promise.all([
      prisma.testRun.count({ where: { ...clientWhere, ...knowledgeWhere } }),
      prisma.testRun.count({
        where: { ...clientWhere, ...knowledgeWhere, clientVerdict: "pass" },
      }),
      prisma.testRun.count({
        where: { ...clientWhere, ...knowledgeWhere, clientVerdict: "fail" },
      }),
      prisma.testRun.count({
        where: {
          ...clientWhere,
          ...knowledgeWhere,
          clientVerdict: "needs-review",
        },
      }),
      prisma.testRun.count({
        where: {
          ...clientWhere,
          ...knowledgeWhere,
          devFixedAt: { not: null },
        },
      }),
      prisma.testRun.count({
        where: { ...clientWhere, ...knowledgeWhere, status: "error" },
      }),
      prisma.testRun.count({
        where: {
          ...clientWhere,
          ...knowledgeWhere,
          status: { in: ["pending", "running"] },
        },
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
    prisma.knowledge.findMany({
      where: scopedClientId ? { clientId: scopedClientId } : {},
      orderBy: { title: "asc" },
      select: { id: true, title: true },
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
    knowledgeId: r.testCase?.knowledge?.id ?? null,
    knowledgeTitle: r.testCase?.knowledge?.title ?? null,
    clientName: r.client?.name ?? null,
    clientSlug: r.client?.slug ?? null,
    messageCount: r.messages.length,
    avgResponseMs: avg(r.messages.map((m) => m.responseTimeMs)),
    issueTags: r.issueTags,
    source: r.source,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  }));

  const exportQuery = buildQuery({ clientId: scopedClientId });

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
          <div className="flex gap-2 text-sm items-center">
            <GroupToggle group={groupBy} sp={sp} />
            <span className="text-muted-foreground">·</span>
            <a
              href={`/admin/export/runs.csv${exportQuery}`}
              className="text-primary hover:underline"
              download
            >
              CSV
            </a>
            <span className="text-muted-foreground">·</span>
            <a
              href={`/admin/export/runs.json${exportQuery}`}
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
          {!scopedClientId && clients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Client:</span>
              <FilterChips
                items={clients}
                paramName="client"
                active={null}
                sp={sp}
              />
            </div>
          )}
          {knowledgeList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Document:</span>
              <FilterChips
                items={knowledgeList.map((k) => ({ id: k.id, name: k.title }))}
                paramName="knowledge"
                active={sp.knowledge ?? null}
                sp={sp}
              />
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
        <RunsTable rows={rows} groupBy={groupBy} />
      )}
    </div>
  );
}

function GroupToggle({
  group,
  sp,
}: {
  group: string;
  sp: Record<string, string | undefined>;
}) {
  const nextGroup = group === "document" ? null : "document";
  const params = new URLSearchParams();
  if (sp.filter && sp.filter !== "all") params.set("filter", sp.filter);
  if (sp.client) params.set("client", sp.client);
  if (sp.knowledge) params.set("knowledge", sp.knowledge);
  if (nextGroup) params.set("group", nextGroup);
  const href = `/admin/runs${params.toString() ? "?" + params.toString() : ""}`;
  return (
    <Link
      href={href}
      className={`text-primary hover:underline ${group === "document" ? "font-semibold" : ""}`}
    >
      {group === "document" ? "Ungroup" : "Group by document"}
    </Link>
  );
}

function FilterChips({
  items,
  paramName,
  active,
  sp,
}: {
  items: { id: string; name: string }[];
  paramName: string;
  active: string | null;
  sp: Record<string, string | undefined>;
}) {
  const build = (id: string | null) => {
    const params = new URLSearchParams();
    if (sp.filter && sp.filter !== "all") params.set("filter", sp.filter);
    if (sp.group === "document") params.set("group", "document");
    if (paramName !== "client" && sp.client) params.set("client", sp.client);
    if (paramName !== "knowledge" && sp.knowledge)
      params.set("knowledge", sp.knowledge);
    if (id) params.set(paramName, id);
    return params.toString() ? `?${params.toString()}` : "";
  };

  return (
    <>
      <Link
        href={`/admin/runs${build(null)}`}
        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
          active === null
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        All
      </Link>
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <Link
            key={it.id}
            href={`/admin/runs${build(it.id)}`}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {it.name}
          </Link>
        );
      })}
    </>
  );
}
