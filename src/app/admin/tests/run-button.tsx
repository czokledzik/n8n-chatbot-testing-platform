"use client";

import { useTransition } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runTestCase } from "./actions";

export function RunButton({ testCaseId }: { testCaseId: string }) {
  const [pending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      try {
        await runTestCase(testCaseId);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg !== "NEXT_REDIRECT") toast.error(msg);
      }
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleRun} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      Run
    </Button>
  );
}
