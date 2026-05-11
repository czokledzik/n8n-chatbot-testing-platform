"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { addClientComment, deleteClientComment } from "./comment-actions";

type Comment = {
  id: string;
  content: string;
  authorScope: string;
  createdAt: Date;
};

export function ClientCommentThread({
  slug,
  runId,
  scope,
  targetId,
  comments,
}: {
  slug: string;
  runId: string;
  scope: "run" | "message";
  targetId: string;
  comments: Comment[];
}) {
  const [open, setOpen] = useState(comments.length > 0);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const content = text.trim();
    if (!content) return;
    startTransition(async () => {
      const res = await addClientComment({
        slug,
        runId,
        scope,
        targetId,
        content,
      });
      if (res.ok) setText("");
      else toast.error(res.error ?? "Failed to add comment");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteClientComment({ slug, runId, commentId: id });
      if (!res.ok) toast.error(res.error ?? "Failed to delete");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
      >
        <MessageSquarePlus className="h-3 w-3" />
        Add comment
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => {
            const isClient = c.authorScope === "client";
            return (
              <li
                key={c.id}
                className="text-xs flex items-start justify-between gap-2 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge
                      variant={isClient ? "default" : "secondary"}
                      className="text-[10px] h-4 px-1.5"
                    >
                      {isClient ? "you" : "admin"}
                    </Badge>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{c.content}</div>
                </div>
                {isClient && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={pending}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className="text-xs"
        />
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
          <Button
            size="xs"
            onClick={handleAdd}
            disabled={pending || text.trim().length === 0}
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
