import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Scale, User } from "lucide-react";
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
import { RunStatusBadge } from "@/components/run-status-badge";
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";
import { getComments } from "@/lib/comments";
import { ClientCommentThread } from "./client-comment-thread";
import { LiveChatBox } from "./live-chat-box";

export default async function ClientRunDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const client = await requireClient(slug);

  const run = await prisma.testRun.findFirst({
    where: { id, clientId: client.id },
    include: {
      testCase: {
        include: { knowledge: { select: { id: true, title: true } } },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!run) notFound();

  const isActive = run.status === "pending" || run.status === "running";
  const isLive = run.source === "live";

  const [runComments, messageComments] = await Promise.all([
    getComments("run", run.id),
    prisma.comment.findMany({
      where: {
        scope: "message",
        targetId: { in: run.messages.map((m) => m.id) },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const commentsByMessage = new Map<string, typeof messageComments>();
  for (const c of messageComments) {
    if (!commentsByMessage.has(c.targetId)) commentsByMessage.set(c.targetId, []);
    commentsByMessage.get(c.targetId)!.push(c);
  }

  return (
    <div className="space-y-6">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={isActive} />

      <div>
        <Link
          href={`/c/${slug}/runs`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All runs
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <RunStatusBadge status={run.status} verdict={run.verdict} />
          {isLive && <Badge variant="outline">Live chat</Badge>}
          {run.hallucination && (
            <Badge
              variant="outline"
              className="border-amber-500/50 text-amber-700 dark:text-amber-400"
            >
              Hallucination
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Started {run.startedAt.toLocaleString()}
          </span>
          {run.finishedAt && (
            <span className="text-xs text-muted-foreground">
              · Finished {run.finishedAt.toLocaleString()}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {run.testCase?.title ?? "Live conversation"}
        </h1>
        {run.testCase?.knowledge && (
          <p className="text-sm text-muted-foreground">
            From{" "}
            <Link
              href={`/c/${slug}/knowledge/${run.testCase.knowledge.id}`}
              className="hover:underline"
            >
              {run.testCase.knowledge.title}
            </Link>
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {run.verdict && run.judgeReason && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Judge verdict
                </CardTitle>
                <CardDescription>{run.judgeReason}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {run.status === "error" && run.judgeReason && !run.verdict && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-sm text-destructive">
                  Run error
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  {run.judgeReason}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversation</CardTitle>
              <CardDescription>
                {run.messages.length} message
                {run.messages.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {run.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isLive
                    ? "Send your first message below."
                    : isActive
                      ? "Waiting for first message…"
                      : "No messages recorded."}
                </p>
              ) : (
                <ul className="space-y-5">
                  {run.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const msgComments = commentsByMessage.get(msg.id) ?? [];
                    return (
                      <li key={msg.id}>
                        <div
                          className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`shrink-0 h-8 w-8 rounded-full grid place-items-center ${
                              isUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isUser ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div
                            className={`max-w-[75%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                                isUser
                                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                                  : "bg-muted text-foreground rounded-tl-sm"
                              }`}
                            >
                              {msg.content}
                            </div>
                            <div className="w-full max-w-md">
                              <ClientCommentThread
                                slug={slug}
                                runId={run.id}
                                scope="message"
                                targetId={msg.id}
                                comments={msgComments.map((c) => ({
                                  id: c.id,
                                  content: c.content,
                                  authorScope: c.authorScope,
                                  createdAt: c.createdAt,
                                }))}
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {isLive && (
            <LiveChatBox
              slug={slug}
              runId={run.id}
              ended={run.status === "done"}
            />
          )}
        </div>

        <aside className="space-y-6">
          {run.testCase && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-foreground/80 text-xs uppercase tracking-wide mb-1">
                    Persona
                  </div>
                  <p className="text-muted-foreground">
                    {run.testCase.persona}
                  </p>
                </div>
                <div>
                  <div className="font-medium text-foreground/80 text-xs uppercase tracking-wide mb-1">
                    Goal
                  </div>
                  <p className="text-muted-foreground">{run.testCase.goal}</p>
                </div>
                <div>
                  <div className="font-medium text-foreground/80 text-xs uppercase tracking-wide mb-1">
                    Success criteria
                  </div>
                  <p className="text-muted-foreground">
                    {run.testCase.successCriteria}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Run comments</CardTitle>
              <CardDescription>Visible to admin too.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientCommentThread
                slug={slug}
                runId={run.id}
                scope="run"
                targetId={run.id}
                comments={runComments.map((c) => ({
                  id: c.id,
                  content: c.content,
                  authorScope: c.authorScope,
                  createdAt: c.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
