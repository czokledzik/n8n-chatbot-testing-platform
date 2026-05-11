"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteClient } from "../actions";

export function DangerZone({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const typed = prompt(
      `Delete client "${clientName}"? Type the name to confirm. This cascades to all knowledge, test cases and runs.`,
    );
    if (typed !== clientName) {
      if (typed !== null) toast.error("Name didn't match — cancelled");
      return;
    }
    startTransition(async () => {
      try {
        await deleteClient(clientId);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg !== "NEXT_REDIRECT") toast.error(msg);
      }
    });
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-4">
      <div>
        <div className="font-medium text-sm text-destructive">Delete client</div>
        <p className="text-xs text-destructive/80">
          Permanent. Cascades to knowledge, test cases and runs.
        </p>
      </div>
      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Delete
      </Button>
    </div>
  );
}
