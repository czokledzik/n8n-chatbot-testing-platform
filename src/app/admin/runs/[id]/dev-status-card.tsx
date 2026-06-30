"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveDevFixNote, setDevFixed } from "./actions";

export function DevStatusCard({
  runId,
  initial,
}: {
  runId: string;
  initial: { devFixedAt: Date | null; devFixNote: string };
}) {
  const [fixed, setFixed] = useState(Boolean(initial.devFixedAt));
  const [note, setNote] = useState(initial.devFixNote);
  const [savedNote, setSavedNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteRef = useRef(initial.devFixNote);

  function toggleFixed() {
    const next = !fixed;
    setFixed(next);
    startTransition(async () => {
      await setDevFixed({ runId, fixed: next });
      toast.success(next ? "Marked as fixed" : "Unmarked");
    });
  }

  useEffect(() => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    if (note === lastNoteRef.current) return;
    noteTimer.current = setTimeout(() => {
      startTransition(async () => {
        await saveDevFixNote({ runId, note });
        lastNoteRef.current = note;
        setSavedNote(true);
        setTimeout(() => setSavedNote(false), 1500);
      });
    }, 600);
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, [note, runId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Dev status
        </CardTitle>
        <CardDescription>
          Mark this run as fixed once you&apos;ve shipped a change addressing
          it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant={fixed ? "default" : "outline"}
          onClick={toggleFixed}
          disabled={pending}
          className={fixed ? "bg-green-600 text-white hover:bg-green-700" : ""}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : fixed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {fixed ? "Fixed" : "Mark as fixed"}
        </Button>
        {initial.devFixedAt && (
          <div className="text-xs text-muted-foreground">
            Marked {new Date(initial.devFixedAt).toLocaleString()}
          </div>
        )}
        <div className="space-y-1.5">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What did you change? (commit link, PR number, brief note)"
            className="text-sm"
          />
          <div className="text-xs text-muted-foreground h-4">
            {savedNote ? "Saved" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
