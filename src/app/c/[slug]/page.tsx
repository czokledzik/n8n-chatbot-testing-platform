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
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { RunStatusBadge } from "@/components/run-status-badge";

export default async function ClientHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await requireClient(slug);

  const [knowledgeCount, runCount, passed, failed, recent] = await Promise.all([
    prisma.knowledge.count({ where: { clientId: client.id } }),
    prisma.testRun.count({ where: { clientId: client.id } }),
    prisma.testRun.count({
      where: { clientId: client.id, status: "done", verdict: "pass" },
    }),
    prisma.testRun.count({
      where: { clientId: client.id, status: "done", verdict: "fail" },
    }),
    prisma.testRun.findMany({
      where: { clientId: client.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { testCase: { select: { title: true } } },
    }),
  ]);

  const judged = passed + failed;
  const passRate = judged === 0 ? null : Math.round((passed / judged) * 100);
  const base = `/c/${slug}`;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
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
                <div className="text-3xl font-semibold tabular-nums">
                  {cta ? "Open" : count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {runCount > 0 && passRate !== null && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">
                {passRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {passed} pass · {failed} fail
              </p>
            </CardContent>
          </Card>
        </div>
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
                        <div className="flex items-center gap-2 mb-1">
                          <RunStatusBadge
                            status={run.status}
                            verdict={run.verdict}
                          />
                          {run.source === "live" && (
                            <span className="text-xs text-muted-foreground">
                              Live chat
                            </span>
                          )}
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
