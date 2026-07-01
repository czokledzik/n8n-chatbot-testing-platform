import Link from "next/link";
import { BookOpen, FlaskConical } from "lucide-react";
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
import { getScopedClientId } from "@/lib/admin-scope";
import { versionStatusForTestCases } from "@/lib/version-entries";
import { VersionStatusPills } from "@/components/version-status-pills";
import { RunButton } from "./run-button";
import { RunAllButton } from "./run-all-button";

export default async function TestsPage() {
  const scopedClientId = await getScopedClientId();
  const knowledgeWithCases = await prisma.knowledge.findMany({
    where: scopedClientId ? { clientId: scopedClientId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      testCases: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { runs: true } } },
      },
    },
  });

  // Batch version status per client
  const byClient = new Map<string, string[]>();
  for (const k of knowledgeWithCases) {
    if (!k.clientId) continue;
    const arr = byClient.get(k.clientId) ?? [];
    for (const tc of k.testCases) arr.push(tc.id);
    byClient.set(k.clientId, arr);
  }

  const versionStatusByTc: Record<
    string,
    Awaited<ReturnType<typeof versionStatusForTestCases>>[string]
  > = {};
  await Promise.all(
    [...byClient.entries()].map(async ([clientId, tcIds]) => {
      const res = await versionStatusForTestCases({ clientId, testCaseIds: tcIds });
      Object.assign(versionStatusByTc, res);
    }),
  );

  const totalCases = knowledgeWithCases.reduce(
    (acc, k) => acc + k.testCases.length,
    0,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Test Cases</h1>
        <p className="text-muted-foreground">
          {totalCases} scenario{totalCases === 1 ? "" : "s"} across{" "}
          {knowledgeWithCases.length} knowledge entr
          {knowledgeWithCases.length === 1 ? "y" : "ies"}.
        </p>
      </header>

      {totalCases === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No test cases yet</CardTitle>
            <CardDescription>
              Generate them from a Knowledge entry.
            </CardDescription>
            <div className="pt-4">
              <Link href="/admin/knowledge" className={buttonVariants()}>
                <BookOpen className="h-4 w-4" />
                Open Knowledge
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {knowledgeWithCases
            .filter((k) => k.testCases.length > 0)
            .map((k) => (
              <Card key={k.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        <Link
                          href={`/admin/knowledge/${k.id}`}
                          className="hover:underline"
                        >
                          {k.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {k.testCases.length} test case
                        {k.testCases.length === 1 ? "" : "s"}
                        {k.client && !scopedClientId && (
                          <span className="text-muted-foreground">
                            {" · "}
                            {k.client.name}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <RunAllButton
                      knowledgeId={k.id}
                      count={k.testCases.length}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {k.testCases.map((tc) => (
                      <li
                        key={tc.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm truncate">
                              {tc.title}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {tc._count.runs} runs
                            </Badge>
                          </div>
                          <VersionStatusPills
                            versions={versionStatusByTc[tc.id] ?? []}
                            runHrefBase="/admin/runs"
                          />
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            <span className="font-medium text-foreground/70">
                              Goal:
                            </span>{" "}
                            {tc.goal}
                          </p>
                        </div>
                        <RunButton testCaseId={tc.id} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
