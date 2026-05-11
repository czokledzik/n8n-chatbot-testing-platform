import { notFound } from "next/navigation";
import Link from "next/link";
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
import { RunStatusBadge } from "@/components/run-status-badge";
import { Poller } from "@/components/poller";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";
import { getComments } from "@/lib/comments";
import { CommentThread } from "./comment-thread";
import { NotesTextarea } from "./notes-textarea";
import { RejudgeButton } from "./rejudge-button";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await prisma.testRun.findUnique({
    where: { id },
    include: {
      testCase: { include: { knowledge: { select: { id: true, title: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run) notFound();

  const isActive = run.status === "pending" || run.status === "running";

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

  const canJudge = run.status === "done" && run.messages.length > 0;

  return (
    <div className="space-y-6">
      <Poller intervalMs={RUN_POLL_INTERVAL_MS} active={isActive} />

      <div>
        <Link
          href="/admin/runs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All runs
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <RunStatusBadge status={run.status} verdict={run.verdict} />
          {run.hallucination ? (
            <Badge
              variant="outline"
              className="border-amber-500/50 text-amber-700 dark:text-amber-400"
            >
              Hallucination
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Started {run.startedAt.toLocaleString()}
          </span>
          {run.finishedAt && (
            <span className="text-xs text-muted-foreground">
              · Finished {run.finishedAt.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {run.testCase?.title ?? "Live conversation"}
            </h1>
            {run.testCase?.knowledge && (
              <p className="text-sm text-muted-foreground mt-1">
                From{" "}
                <Link
                  href={`/admin/knowledge/${run.testCase.knowledge.id}`}
                  className="hover:underline"
                >
                  {run.testCase.knowledge.title}
                </Link>
              </p>
            )}
          </div>
          {canJudge && run.testCase && <RejudgeButton runId={run.id} />}
        </div>
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
                  {isActive
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
                            <div className={`w-full max-w-md ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                              <CommentThread
                                scope="message"
                                targetId={msg.id}
                                runId={run.id}
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
                  {isActive && (
                    <li className="text-xs text-muted-foreground text-center pt-2">
                      Live · refreshes every {RUN_POLL_INTERVAL_MS / 1000}s
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
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
              <CardTitle className="text-sm">Notes</CardTitle>
              <CardDescription>Auto-saved as you type.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotesTextarea runId={run.id} initial={run.notes ?? ""} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Run notes</CardTitle>
              <CardDescription>Threaded comments on the run.</CardDescription>
            </CardHeader>
            <CardContent>
              <CommentThread
                scope="run"
                targetId={run.id}
                runId={run.id}
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
