"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { endLiveSession, sendLiveMessage } from "../../chat/actions";

export function LiveChatBox({
  slug,
  runId,
  ended,
}: {
  slug: string;
  runId: string;
  ended: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const content = text.trim();
    if (!content || pending) return;
    startTransition(async () => {
      const res = await sendLiveMessage({ slug, runId, message: content });
      if (res.ok) {
        setText("");
        setTimeout(() => taRef.current?.focus(), 50);
      } else {
        toast.error(res.error ?? "Failed to send");
      }
    });
  }

  function handleEnd() {
    if (!confirm("End this session? You can still view it later.")) return;
    startTransition(async () => {
      await endLiveSession({ slug, runId });
      toast.success("Session ended");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (ended) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
        Session ended. Start a new one from the Live Chat tab.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3 space-y-2">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          disabled={pending}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={pending || text.trim().length === 0}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEnd}
          disabled={pending}
          className="text-muted-foreground"
        >
          <StopCircle className="h-3.5 w-3.5" />
          End session
        </Button>
      </div>
    </div>
  );
}
