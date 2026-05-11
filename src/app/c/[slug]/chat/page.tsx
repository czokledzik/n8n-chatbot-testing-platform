import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
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
import { StartSessionButton } from "./start-session-button";

export default async function ClientChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await requireClient(slug);

  const sessions = await prisma.testRun.findMany({
    where: { clientId: client.id, source: "live" },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { messages: true } } },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Live Chat</h1>
          <p className="text-muted-foreground">
            Talk to your chatbot directly. Every session is saved so you can
            review it later.
          </p>
        </div>
        <StartSessionButton slug={slug} />
      </header>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center mb-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">No live sessions yet</CardTitle>
            <CardDescription>
              Start one to begin chatting with your bot.
            </CardDescription>
            <div className="pt-4">
              <StartSessionButton slug={slug} />
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Past sessions</CardTitle>
            <CardDescription>{sessions.length} total</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/c/${slug}/runs/${s.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Live</Badge>
                        <Badge
                          variant={s.status === "done" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        {s._count.messages} messages
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.startedAt.toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
