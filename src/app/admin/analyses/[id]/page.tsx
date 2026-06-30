import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import type { BatchAnalysisResult } from "@/lib/batch-analysis";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await prisma.analysisReport.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true, slug: true } } },
  });
  if (!report) notFound();

  let parsed: BatchAnalysisResult;
  try {
    parsed = JSON.parse(report.resultJson) as BatchAnalysisResult;
  } catch {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Analysis #{report.id}</h1>
        <p className="text-destructive">Could not parse stored result JSON.</p>
        <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md">
          {report.resultJson}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/clients/${report.client.id}/analyses`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {report.client.name} analyses
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Batch analysis
          </Badge>
          <span className="text-xs text-muted-foreground">
            {report.client.name} · {report.inputRunIds.length} runs ·{" "}
            {report.createdAt.toLocaleString()}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {report.title}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall takeaways</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {parsed.overallTakeaways}
          </p>
        </CardContent>
      </Card>

      {parsed.clusters.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardDescription>No clusters identified.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Clusters ({parsed.clusters.length})
          </h2>
          {parsed.clusters.map((cluster, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{cluster.label}</CardTitle>
                    <CardDescription className="mt-1">
                      {cluster.summary}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {cluster.runIds.length} runs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cluster.examples.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-foreground/80 mb-1.5">
                      Examples
                    </div>
                    <ul className="space-y-1.5">
                      {cluster.examples.map((ex, i) => (
                        <li
                          key={i}
                          className="text-xs rounded-md bg-muted/50 px-3 py-2 whitespace-pre-wrap"
                        >
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-foreground/80 mb-1.5">
                    Runs in this cluster
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.runIds.map((runId) => (
                      <Link
                        key={runId}
                        href={`/admin/runs/${runId}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs hover:bg-muted font-mono"
                      >
                        {runId.slice(0, 8)}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
