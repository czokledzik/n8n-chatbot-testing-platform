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
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await requireClient(slug);

  const runs = await prisma.testRun.findMany({
    where: { clientId: client.id },
    orderBy: { startedAt: "desc" },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { messages: true } },
    },
    take: 100,
  });

  const hasActive = runs.some(
    (r) => r.status === "pending" || r.status === "running",
  );

  return (
    <div className="space-y-8">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={hasActive} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Test Runs</h1>
        <p className="text-muted-foreground">
          Automated test executions and your live chat sessions.
        </p>
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/c/${slug}/runs/${run.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RunStatusBadge
                          status={run.status}
                          verdict={run.verdict}
                        />
                        {run.source === "live" && (
                          <Badge variant="outline" className="text-xs">
                            Live chat
                          </Badge>
                        )}
                        {run.hallucination && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
                          >
                            Hallucination
                          </Badge>
                        )}
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
