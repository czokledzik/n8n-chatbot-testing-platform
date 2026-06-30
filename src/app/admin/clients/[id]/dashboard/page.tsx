import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

type Cell = {
  runId: string;
  verdict: string | null;
  finishedAt: Date | null;
  avgResponseMs: number | null;
};

function cellColor(verdict: string | null) {
  if (verdict === "pass") return "bg-green-600 text-white";
  if (verdict === "fail") return "bg-red-600 text-white";
  if (verdict === "needs-review") return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

function cellLabel(verdict: string | null) {
  if (verdict === "pass") return "✓";
  if (verdict === "fail") return "✗";
  if (verdict === "needs-review") return "?";
  return "·";
}

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const [versions, testCases, runs] = await Promise.all([
    prisma.botVersion.findMany({
      where: { clientId: id },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, isActive: true },
    }),
    prisma.testCase.findMany({
      where: { knowledge: { clientId: id } },
      orderBy: { createdAt: "desc" },
      include: { knowledge: { select: { title: true } } },
    }),
    prisma.testRun.findMany({
      where: { clientId: id, source: "test", testCaseId: { not: null } },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        testCaseId: true,
        botVersionId: true,
        clientVerdict: true,
        finishedAt: true,
        messages: { select: { responseTimeMs: true } },
      },
    }),
  ]);

  const matrix = new Map<string, Map<string, Cell>>();
  for (const r of runs) {
    if (!r.testCaseId || !r.botVersionId) continue;
    const tcMap = matrix.get(r.testCaseId) ?? new Map<string, Cell>();
    const existing = tcMap.get(r.botVersionId);
    if (existing) continue;
    const avg =
      r.messages.length > 0
        ? Math.round(
            r.messages
              .filter((m) => typeof m.responseTimeMs === "number")
              .reduce((a, b) => a + (b.responseTimeMs ?? 0), 0) /
              Math.max(
                r.messages.filter((m) => typeof m.responseTimeMs === "number")
                  .length,
                1,
              ),
          )
        : null;
    tcMap.set(r.botVersionId, {
      runId: r.id,
      verdict: r.clientVerdict,
      finishedAt: r.finishedAt,
      avgResponseMs: avg,
    });
    matrix.set(r.testCaseId, tcMap);
  }

  const stats = versions.map((v) => {
    const versionRuns = runs.filter((r) => r.botVersionId === v.id);
    const passed = versionRuns.filter((r) => r.clientVerdict === "pass").length;
    const failed = versionRuns.filter((r) => r.clientVerdict === "fail").length;
    const judged = passed + failed;
    const avgMs = (() => {
      const allMs = versionRuns.flatMap((r) =>
        r.messages
          .filter((m) => typeof m.responseTimeMs === "number")
          .map((m) => m.responseTimeMs as number),
      );
      if (allMs.length === 0) return null;
      return Math.round(allMs.reduce((a, b) => a + b, 0) / allMs.length);
    })();
    return {
      id: v.id,
      label: v.label,
      isActive: v.isActive,
      total: versionRuns.length,
      passed,
      failed,
      passRate: judged > 0 ? Math.round((passed / judged) * 100) : null,
      avgMs,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/clients/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {client.name}
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {client.name} dashboard
        </h1>
        <p className="text-muted-foreground">
          Compare bot versions side-by-side. Click any cell to open the run.
        </p>
      </header>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}>
        {stats.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono">{s.label}</CardTitle>
                {s.isActive && (
                  <Badge className="bg-green-600 text-white text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                Pass rate:{" "}
                <span className="font-semibold">
                  {s.passRate === null ? "—" : `${s.passRate}%`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {s.total} runs · {s.passed} pass / {s.failed} fail
              </div>
              <div className="text-xs text-muted-foreground">
                Avg response:{" "}
                {s.avgMs !== null ? `${(s.avgMs / 1000).toFixed(2)}s` : "—"}
              </div>
            </CardContent>
          </Card>
        ))}
        {stats.length === 0 && (
          <Card className="border-dashed col-span-full">
            <CardHeader className="text-center">
              <CardDescription>
                No bot versions yet. Add one in client settings.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {testCases.length > 0 && versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Test case × bot version heatmap
            </CardTitle>
            <CardDescription>
              Each cell is the latest run for that combination, colored by
              client verdict.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 font-medium text-xs text-muted-foreground">
                      Test case
                    </th>
                    {versions.map((v) => (
                      <th
                        key={v.id}
                        className="text-center px-2 py-1 font-mono text-xs"
                      >
                        {v.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <tr key={tc.id} className="border-t">
                      <td className="px-2 py-1.5 text-xs max-w-[240px] truncate">
                        {tc.title}
                      </td>
                      {versions.map((v) => {
                        const cell = matrix.get(tc.id)?.get(v.id);
                        if (!cell) {
                          return (
                            <td
                              key={v.id}
                              className="text-center px-2 py-1.5 text-muted-foreground"
                            >
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={v.id} className="text-center px-2 py-1.5">
                            <Link
                              href={`/admin/runs/${cell.runId}`}
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-md text-xs font-semibold ${cellColor(
                                cell.verdict,
                              )}`}
                              title={
                                cell.verdict ??
                                "no verdict — click to open run"
                              }
                            >
                              {cellLabel(cell.verdict)}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-green-600" /> pass
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-600" /> fail
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-amber-500" /> needs review
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-muted" /> no verdict
              </span>
              <span>·</span>
              <span>— = no run for that combination</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
