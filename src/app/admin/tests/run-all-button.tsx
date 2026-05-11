"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAllForKnowledge } from "./actions";

export function RunAllButton({
  knowledgeId,
  count,
}: {
  knowledgeId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRun() {
    if (!confirm(`Start ${count} run${count === 1 ? "" : "s"} in parallel?`)) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await runAllForKnowledge(knowledgeId);
        toast.success(`${result.count} runs started`);
        router.push("/admin/runs");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Button size="sm" variant="secondary" onClick={handleRun} disabled={pending || count === 0}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      Run all
    </Button>
  );
}
