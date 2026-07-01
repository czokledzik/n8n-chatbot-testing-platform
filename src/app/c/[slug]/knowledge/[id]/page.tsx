import Link from "next/link";
import { notFound } from "next/navigation";
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
import { requireClient } from "@/lib/auth";

export default async function ClientKnowledgeDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const client = await requireClient(slug);

  const knowledge = await prisma.knowledge.findFirst({
    where: { id, clientId: client.id },
    include: {
      testCases: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { runs: true } } },
      },
    },
  });
  if (!knowledge) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/c/${slug}/knowledge`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All knowledge
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {knowledge.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          Added {knowledge.createdAt.toLocaleString()} ·{" "}
          {knowledge.content.length.toLocaleString()} chars
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 font-sans">
            {knowledge.content}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test cases</CardTitle>
          <CardDescription>
            {knowledge.testCases.length === 0
              ? "No test cases yet."
              : `${knowledge.testCases.length} scenario${knowledge.testCases.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {knowledge.testCases.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <FlaskConical className="h-6 w-6 mx-auto mb-2 opacity-50" />
              The admin hasn&apos;t generated test cases yet.
            </div>
          ) : (
            <ul className="divide-y">
              {knowledge.testCases.map((tc) => (
                <li key={tc.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/c/${slug}/knowledge/${knowledge.id}/tests/${tc.id}`}
                    className="block -mx-4 px-4 py-1 hover:bg-muted/40 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{tc.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {tc._count.runs} run{tc._count.runs === 1 ? "" : "s"}
                      </Badge>
                    </div>
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
