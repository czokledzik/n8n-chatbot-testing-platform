"use client";

import { useTransition } from "react";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rejudge } from "./actions";

export function RejudgeButton({ runId }: { runId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await rejudge(runId);
      if (res.ok) toast.success("Re-judged");
      else toast.error(res.error ?? "Re-judge failed");
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Scale className="h-4 w-4" />
      )}
      Re-judge
    </Button>
  );
}
