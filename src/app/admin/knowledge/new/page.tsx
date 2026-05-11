import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { NewKnowledgeForm } from "./new-knowledge-form";

export default async function NewKnowledgePage({
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
            New Knowledge
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
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          New Knowledge
        </h1>
        <p className="text-muted-foreground">
          Paste raw reference text. This is what the chatbot is expected to know
          and reason from.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference content</CardTitle>
          <CardDescription>
            Markdown, plain text or anything else. Minimum 20 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewKnowledgeForm
            clients={clients}
            defaultClientId={defaultClientId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
