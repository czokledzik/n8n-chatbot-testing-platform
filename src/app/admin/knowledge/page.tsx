import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
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

export default async function KnowledgePage() {
  const scopedClientId = await getScopedClientId();
  const items = await prisma.knowledge.findMany({
    where: scopedClientId ? { clientId: scopedClientId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { testCases: true } },
      client: { select: { name: true, slug: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Knowledge</h1>
          <p className="text-muted-foreground">
            Reference text the chatbot is expected to know.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/knowledge/batch-new"
            className={buttonVariants({ variant: "outline" })}
          >
            Batch upload
          </Link>
          <Link href="/admin/knowledge/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            New Knowledge
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No knowledge yet</CardTitle>
            <CardDescription>
              Paste reference text to start generating test cases.
            </CardDescription>
            <div className="pt-4">
              <Link href="/admin/knowledge/new" className={buttonVariants()}>
                <Plus className="h-4 w-4" />
                Add your first
              </Link>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((k) => (
            <Link key={k.id} href={`/admin/knowledge/${k.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">
                      {k.title}
                    </CardTitle>
                    <Badge variant="secondary">
                      {k._count.testCases} cases
                    </Badge>
                  </div>
                  {k.client && (
                    <div className="text-xs text-muted-foreground">
                      Client: <span className="font-medium text-foreground/80">{k.client.name}</span>{" "}
                      <span className="font-mono opacity-60">/c/{k.client.slug}</span>
                    </div>
                  )}
                  <CardDescription className="line-clamp-3">
                    {k.content}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Added {k.createdAt.toLocaleDateString()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
