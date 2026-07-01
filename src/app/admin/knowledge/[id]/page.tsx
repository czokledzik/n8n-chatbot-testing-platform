import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { versionStatusForTestCases } from "@/lib/version-entries";
import { VersionStatusPills } from "@/components/version-status-pills";
import { GenerateButton } from "./generate-button";
import { DeleteKnowledgeButton } from "./delete-button";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const knowledge = await prisma.knowledge.findUnique({
    where: { id },
    include: {
      testCases: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { runs: true } } },
      },
    },
  });

  if (!knowledge) notFound();

  const versionStatusByTc = knowledge.clientId
    ? await versionStatusForTestCases({
        clientId: knowledge.clientId,
        testCaseIds: knowledge.testCases.map((tc) => tc.id),
      })
    : {};

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to knowledge
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight truncate">
            {knowledge.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Added {knowledge.createdAt.toLocaleString()} ·{" "}
            {knowledge.content.length.toLocaleString()} chars
          </p>
        </div>
        <DeleteKnowledgeButton id={knowledge.id} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 font-sans">
            {knowledge.content}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Test cases</CardTitle>
            <CardDescription>
              {knowledge.testCases.length === 0
                ? "No test cases yet — generate some with OpenAI."
                : `${knowledge.testCases.length} scenario${knowledge.testCases.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          <GenerateButton knowledgeId={knowledge.id} />
        </CardHeader>
        <CardContent>
          {knowledge.testCases.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <FlaskConical className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Pick a count and click Generate.
            </div>
          ) : (
            <ul className="divide-y">
              {knowledge.testCases.map((tc) => (
                <li key={tc.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{tc.title}</h3>
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
                          Persona:
                        </span>{" "}
                        {tc.persona}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        <span className="font-medium text-foreground/70">
                          Goal:
                        </span>{" "}
                        {tc.goal}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
