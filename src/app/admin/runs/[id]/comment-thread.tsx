"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "./comment-actions";

type Comment = {
  id: string;
  content: string;
  authorScope?: string;
  createdAt: Date;
};

export function CommentThread({
  scope,
  targetId,
  runId,
  comments,
}: {
  scope: "run" | "message";
  targetId: string;
  runId: string;
  comments: Comment[];
}) {
  const [open, setOpen] = useState(comments.length > 0);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const content = text.trim();
    if (!content) return;
    startTransition(async () => {
      const res = await addComment({ scope, targetId, content, runId });
      if (res.ok) {
        setText("");
      } else {
        toast.error(res.error ?? "Failed to add comment");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteComment({ id, runId });
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
        <ul className="space-y-1.5">
          {comments.map((c) => (
            <li
              key={c.id}
              className="text-xs flex items-start justify-between gap-2 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge
                    variant={c.authorScope === "client" ? "default" : "secondary"}
                    className="text-[10px] h-4 px-1.5"
                  >
                    {c.authorScope === "client" ? "client" : "admin"}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{c.content}</div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                disabled={pending}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
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
