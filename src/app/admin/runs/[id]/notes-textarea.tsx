"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { saveRunNotes } from "./comment-actions";

export function NotesTextarea({
  runId,
  initial,
}: {
  runId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const lastSavedRef = useRef(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value === lastSavedRef.current) return;

    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        await saveRunNotes({ runId, notes: value });
        lastSavedRef.current = value;
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, runId]);

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Your notes about this run…"
      />
      <div className="text-xs text-muted-foreground h-4 flex items-center gap-1">
        {pending ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </>
        ) : saved ? (
          <>
            <Check className="h-3 w-3" />
            Saved
          </>
        ) : null}
      </div>
    </div>
  );
}
