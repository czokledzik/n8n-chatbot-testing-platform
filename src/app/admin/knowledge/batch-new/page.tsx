import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { BatchKnowledgeForm } from "./batch-form";

export default async function BatchNewKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sp = await searchParams;
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  if (clients.length === 0) {
    return (
      <div className="space-y-8 max-w-2xl">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Batch knowledge upload
          </h1>
        </header>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No clients yet</CardTitle>
            <CardDescription>
              Knowledge must belong to a client. Create one first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/clients/new" className={buttonVariants()}>
              Create a client
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const defaultClientId = sp.clientId ?? clients[0].id;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Knowledge
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Batch knowledge upload
        </h1>
        <p className="text-muted-foreground">
          Add multiple documents at once. For each you can paste text or upload
          a PDF, and pick how many test cases OpenAI should generate.
        </p>
      </header>

      <BatchKnowledgeForm
        clients={clients}
        defaultClientId={defaultClientId}
      />
    </div>
  );
}
