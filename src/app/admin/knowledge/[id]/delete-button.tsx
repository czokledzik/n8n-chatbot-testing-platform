"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteKnowledge } from "../actions";

export function DeleteKnowledgeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        "Delete this knowledge entry? All test cases and runs will be removed.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteKnowledge(id);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
      className="text-destructive hover:text-destructive"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Delete
    </Button>
  );
}
