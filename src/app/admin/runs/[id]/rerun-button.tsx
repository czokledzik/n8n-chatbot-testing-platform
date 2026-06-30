"use client";

import { useState, useTransition } from "react";
import { Loader2, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reRunOnVersion } from "@/app/admin/tests/actions";

type Version = {
  id: string;
  label: string;
  isActive: boolean;
};

export function ReRunButton({
  sourceRunId,
  versions,
  currentVersionId,
}: {
  sourceRunId: string;
  versions: Version[];
  currentVersionId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRun() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await reRunOnVersion({ sourceRunId, botVersionId: selected });
      } catch (err) {
        const msg = (err as Error).message;
        if (msg !== "NEXT_REDIRECT") toast.error(msg);
      }
    });
  }

  if (versions.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled title="No bot versions yet">
        <Repeat className="h-4 w-4" />
        Re-run on version
      </Button>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Repeat className="h-4 w-4" />
        Re-run on version
      </Button>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3 space-y-3 w-72">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Pick target version</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {versions.map((v) => {
          const active = selected === v.id;
          const isCurrent = v.id === currentVersionId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelected(v.id)}
              disabled={pending}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {v.label}
              {v.isActive && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  active
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  current
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={handleRun}
        disabled={pending || !selected}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Start re-run
      </Button>
      <p className="text-xs text-muted-foreground">
        The new run will use the same test case but the picked version&apos;s
        webhook. The simulator will probe the same problems as the source run.
      </p>
    </div>
  );
}
