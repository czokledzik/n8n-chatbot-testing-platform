import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  FlaskConical,
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
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Separator } from "@/components/ui/separator";

export default async function HomePage() {
  const [
    knowledgeCount,
    testCaseCount,
    testRunCount,
    passedCount,
    failedCount,
    hallucinationCount,
    settings,
  ] = await Promise.all([
    prisma.knowledge.count(),
    prisma.testCase.count(),
    prisma.testRun.count(),
    prisma.testRun.count({ where: { status: "done", verdict: "pass" } }),
    prisma.testRun.count({ where: { status: "done", verdict: "fail" } }),
    prisma.testRun.count({ where: { hallucination: true } }),
    getSettings(),
  ]);

  const configured = Boolean(settings.n8nWebhookUrl && settings.openaiApiKey);
  const judgedCount = passedCount + failedCount;
  const passRate =
    judgedCount === 0 ? null : Math.round((passedCount / judgedCount) * 100);

  const cards = [
    {
      label: "Knowledge",
      count: knowledgeCount,
      href: "/admin/knowledge",
      icon: BookOpen,
      hint: "Pasted reference text",
    },
    {
      label: "Test Cases",
      count: testCaseCount,
      href: "/admin/tests",
      icon: FlaskConical,
      hint: "Generated scenarios",
    },
    {
      label: "Test Runs",
      count: testRunCount,
      href: "/admin/runs",
      icon: PlayCircle,
      hint: "Executions & verdicts",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Local platform for testing your n8n chatbot end-to-end.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            {configured
              ? "n8n webhook & OpenAI key are set. You're ready to seed knowledge."
              : "Set your n8n webhook URL and OpenAI API key to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open Settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, count, href, icon: Icon, hint }) => (
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
                  {count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {testRunCount > 0 && (
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
                {passRate === null ? "—" : `${passRate}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {judgedCount === 0
                  ? "No judged runs yet"
                  : `${passedCount} pass · ${failedCount} fail`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hallucinations flagged
              </CardTitle>
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">
                {hallucinationCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all judged runs
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
