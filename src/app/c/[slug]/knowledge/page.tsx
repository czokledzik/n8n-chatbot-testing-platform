import Link from "next/link";
import { BookOpen } from "lucide-react";
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

export default async function ClientKnowledgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await requireClient(slug);

  const items = await prisma.knowledge.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { testCases: true } } },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Knowledge</h1>
        <p className="text-muted-foreground">
          Reference material the admin used to drive automated tests.
        </p>
      </header>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No knowledge yet</CardTitle>
            <CardDescription>
              The admin hasn&apos;t added reference material yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((k) => (
            <Link
              key={k.id}
              href={`/c/${slug}/knowledge/${k.id}`}
              className="group"
            >
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
