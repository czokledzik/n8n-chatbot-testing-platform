import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  PlayCircle,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { RunStatusBadge } from "@/components/run-status-badge";
import {
  ClientVerdictBadge,
  IssueTagsDisplay,
} from "@/components/issue-tags-display";
import { labelForTag } from "@/lib/constants";

export default async function ClientHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await requireClient(slug);

  const [
    knowledgeCount,
    runCount,
    passed,
    failed,
    needsReview,
    recent,
    versions,
    runsForStats,
  ] = await Promise.all([
    prisma.knowledge.count({ where: { clientId: client.id } }),
    prisma.testRun.count({ where: { clientId: client.id } }),
    prisma.testRun.count({
      where: { clientId: client.id, clientVerdict: "pass" },
    }),
    prisma.testRun.count({
      where: { clientId: client.id, clientVerdict: "fail" },
    }),
    prisma.testRun.count({
      where: { clientId: client.id, clientVerdict: "needs-review" },
    }),
    prisma.testRun.findMany({
      where: { clientId: client.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        testCase: { select: { title: true } },
        botVersion: { select: { label: true } },
      },
    }),
    prisma.botVersion.findMany({
      where: { clientId: client.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, isActive: true },
    }),
    prisma.testRun.findMany({
      where: { clientId: client.id },
      select: {
        botVersionId: true,
        clientVerdict: true,
        issueTags: true,
      },
    }),
  ]);

  const judged = passed + failed;
  const passRate = judged === 0 ? null : Math.round((passed / judged) * 100);
  const base = `/c/${slug}`;

  // Per-version stats
  const versionStats = versions.map((v) => {
    const vRuns = runsForStats.filter((r) => r.botVersionId === v.id);
    const p = vRuns.filter((r) => r.clientVerdict === "pass").length;
    const f = vRuns.filter((r) => r.clientVerdict === "fail").length;
    const nr = vRuns.filter((r) => r.clientVerdict === "needs-review").length;
    const total = vRuns.length;
    const rate = p + f === 0 ? null : Math.round((p / (p + f)) * 100);
    return { ...v, p, f, nr, total, rate };
  });

  // Tag counts across all runs
  const tagCounts = new Map<string, number>();
  for (const r of runsForStats) {
    for (const t of r.issueTags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const tagsSorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxTagCount = tagsSorted[0]?.[1] ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Welcome, {client.name}
        </h1>
        <p className="text-muted-foreground">
          Read-only view of automated tests run against your chatbot, plus a
          live chat tool.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Knowledge",
            count: knowledgeCount,
            href: `${base}/knowledge`,
            icon: BookOpen,
            hint: "Reference material",
          },
          {
            label: "Test Runs",
            count: runCount,
            href: `${base}/runs`,
            icon: PlayCircle,
            hint: "Automated + live",
          },
          {
            label: "Live Chat",
            count: 0,
            href: `${base}/chat`,
            icon: MessageCircle,
            hint: "Talk to your bot",
            cta: true,
          },
        ].map(({ label, count, href, icon: Icon, hint, cta }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-semibold tabular-nums">
                  {cta ? "Open" : count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {passRate !== null && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-semibold tabular-nums">
                {passRate}%
              </div>
              <div className="mt-2 h-3 w-full rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(passed / (passed + failed + needsReview || 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(failed / (passed + failed + needsReview || 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(needsReview / (passed + failed + needsReview || 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {passed} pass · {failed} fail
                {needsReview > 0 && ` · ${needsReview} needs review`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {versionStats.length > 0 && versionStats.some((v) => v.total > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Pass rate by bot version
            </CardTitle>
            <CardDescription>
              Compare how each version handles your test suite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versionStats.map((v) => (
                <div key={v.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold">{v.label}</span>
                    {v.isActive && (
                      <Badge className="verdict-pass backdrop-blur-sm text-[10px] h-4 px-1.5">
                        active
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs ml-auto tabular-nums">
                      {v.rate === null ? "—" : `${v.rate}%`}{" "}
                      <span className="opacity-60">
                        ({v.p}/{v.p + v.f})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                    {v.total > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(v.p / v.total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(v.f / v.total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(v.nr / v.total) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tagsSorted.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top issue tags</CardTitle>
            <CardDescription>
              Most frequent problems flagged across all runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tagsSorted.slice(0, 7).map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-3 text-sm">
                  <span className="w-32 truncate text-muted-foreground">
                    {labelForTag(tag)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${maxTagCount === 0 ? 0 : (count / maxTagCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-xs w-8 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recent.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent runs</CardTitle>
              <CardDescription>Latest 5</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recent.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`${base}/runs/${run.id}`}
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
                            <span className="text-xs text-muted-foreground">
                              Live chat
                            </span>
                          )}
                          <IssueTagsDisplay tags={run.issueTags} size="xs" />
                        </div>
                        <div className="font-medium text-sm truncate">
                          {run.testCase?.title ?? "Live conversation"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
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
        </>
      )}
    </div>
  );
}
