import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, User } from "lucide-react";
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
import { RUN_POLL_INTERVAL_MS, type ClientVerdict } from "@/lib/constants";
import { getComments } from "@/lib/comments";
import {
  ClientVerdictBadge,
  IssueTagsDisplay,
} from "@/components/issue-tags-display";
import { ClientCommentThread } from "./client-comment-thread";
import { LiveChatBox } from "./live-chat-box";
import { ClientReviewCard } from "./client-review-card";

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
      botVersion: { select: { label: true } },
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
          <RunStatusBadge status={run.status} verdict={null} />
          <ClientVerdictBadge verdict={run.clientVerdict} />
          {run.botVersion && (
            <Badge variant="secondary" className="font-mono text-xs">
              {run.botVersion.label}
            </Badge>
          )}
          {isLive && <Badge variant="outline">Live chat</Badge>}
          <IssueTagsDisplay tags={run.issueTags} />
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
          {run.status === "error" && run.judgeReason && (
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
                <ul className="space-y-5 chat-canvas p-4">
                  {run.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const msgComments = commentsByMessage.get(msg.id) ?? [];
                    return (
                      <li key={msg.id}>
                        <div
                          className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`shrink-0 h-8 w-8 rounded-full grid place-items-center backdrop-blur-sm ${
                              isUser
                                ? "chat-bubble-user"
                                : "chat-bubble-bot text-muted-foreground"
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
                                  ? "chat-bubble-user rounded-tr-sm"
                                  : "chat-bubble-bot rounded-tl-sm"
                              }`}
                            >
                              {msg.content}
                            </div>
                            {!isUser && msg.responseTimeMs !== null && (
                              <div className="text-[10px] text-muted-foreground mt-1 pl-1">
                                {(msg.responseTimeMs / 1000).toFixed(2)}s
                              </div>
                            )}
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
          <ClientReviewCard
            slug={slug}
            runId={run.id}
            initial={{
              clientVerdict: (run.clientVerdict as ClientVerdict | null) ?? null,
              clientVerifiedAt: run.clientVerifiedAt,
              issueTags: run.issueTags ?? [],
            }}
          />

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
