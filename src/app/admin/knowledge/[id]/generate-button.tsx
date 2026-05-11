"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateTestCases } from "./generate-action";

const COUNTS = [3, 5, 10] as const;

export function GenerateButton({ knowledgeId }: { knowledgeId: string }) {
  const [count, setCount] = useState<3 | 5 | 10>(5);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateTestCases(knowledgeId, count);
      if (result.ok) {
        toast.success(`Generated ${result.count} test cases`);
      } else {
        toast.error(result.error ?? "Generation failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-md border bg-background p-0.5">
        {COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            disabled={pending}
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${
              count === n
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <Button onClick={handleGenerate} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate test cases
      </Button>
    </div>
  );
}
