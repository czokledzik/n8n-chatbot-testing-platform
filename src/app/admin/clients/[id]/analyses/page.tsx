import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

export default async function ClientAnalysesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const reports = await prisma.analysisReport.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
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
        <h1 className="text-3xl font-semibold tracking-tight">Analyses</h1>
        <p className="text-muted-foreground">
          Batch analysis reports for {client.name}.
        </p>
      </header>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-10">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No analyses yet</CardTitle>
            <CardDescription>
              Select runs in /admin/runs and click &quot;Analyze batch&quot;.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/analyses/${r.id}`}
                className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.inputRunIds.length} runs ·{" "}
                  {r.createdAt.toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
