import Link from "next/link";
import { Plus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { knowledge: true, testRuns: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Each client gets a magic link to a read-only portal with their runs
            and a live chat.
          </p>
        </div>
        <Link href="/admin/clients/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New client
        </Link>
      </header>

      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No clients yet</CardTitle>
            <CardDescription>
              Create one to scope knowledge and share results.
            </CardDescription>
            <div className="pt-4">
              <Link href="/admin/clients/new" className={buttonVariants()}>
                <Plus className="h-4 w-4" />
                Add your first
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.name}</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          /c/{c.slug}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c._count.knowledge} knowledge ·{" "}
                        {c._count.testRuns} runs · added{" "}
                        {c.createdAt.toLocaleDateString()}
                      </div>
                    </div>
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
