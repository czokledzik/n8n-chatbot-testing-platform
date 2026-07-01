import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  PlayCircle,
  Target,
  Users,
  Wrench,
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
import { getScopedClientId } from "@/lib/admin-scope";

export default async function HomePage() {
  const scopedClientId = await getScopedClientId();
  const clientScope = scopedClientId ? { clientId: scopedClientId } : {};
  const knowledgeScope = scopedClientId ? { clientId: scopedClientId } : {};
  const testCaseScope = scopedClientId
    ? { knowledge: { clientId: scopedClientId } }
    : {};

  const [
    knowledgeCount,
    testCaseCount,
    testRunCount,
    clientCount,
    passedCount,
    failedCount,
    fixedCount,
    settings,
  ] = await Promise.all([
    prisma.knowledge.count({ where: knowledgeScope }),
    prisma.testCase.count({ where: testCaseScope }),
    prisma.testRun.count({ where: clientScope }),
    prisma.client.count(),
    prisma.testRun.count({
      where: { ...clientScope, clientVerdict: "pass" },
    }),
    prisma.testRun.count({
      where: { ...clientScope, clientVerdict: "fail" },
    }),
    prisma.testRun.count({
      where: { ...clientScope, devFixedAt: { not: null } },
    }),
    getSettings(),
  ]);

  const configured = Boolean(settings.n8nWebhookUrl && settings.openaiApiKey);
  const judgedCount = passedCount + failedCount;
  const passRate =
    judgedCount === 0 ? null : Math.round((passedCount / judgedCount) * 100);

  const cards = [
    {
      label: "Clients",
      count: clientCount,
      href: "/admin/clients",
      icon: Users,
      hint: "Tenants with portal access",
    },
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
          Platform for testing n8n chatbots with client portal access.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            {configured
              ? "Global defaults set. Each client can also have their own webhook URL via bot versions."
              : "Set your global OpenAI API key (and optional fallback n8n URL)."}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                Pass rate (client-marked)
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">
                {passRate === null ? "—" : `${passRate}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {judgedCount === 0
                  ? "No client-marked runs yet"
                  : `${passedCount} pass · ${failedCount} fail`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Runs marked fixed
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">
                {fixedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dev shipped changes for these runs
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
