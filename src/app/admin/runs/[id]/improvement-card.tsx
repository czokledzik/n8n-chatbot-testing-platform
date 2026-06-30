"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Minus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { runImprovementCheck } from "./improvement-actions";

type SourceSummary = {
  id: string;
  botVersionLabel: string | null;
  clientVerdict: string | null;
  messageCount: number;
  avgResponseMs: number | null;
};

type CurrentSummary = {
  messageCount: number;
  avgResponseMs: number | null;
};

export function ImprovementCard({
  runId,
  source,
  current,
  improvementVerdict,
  improvementReason,
  canCheck,
}: {
  runId: string;
  source: SourceSummary;
  current: CurrentSummary;
  improvementVerdict: string | null;
  improvementReason: string | null;
  canCheck: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleCheck() {
    startTransition(async () => {
      const res = await runImprovementCheck(runId);
      if (res.ok) toast.success("Comparison done");
      else toast.error(res.error ?? "Failed");
    });
  }

  const verdictMeta: Record<
    string,
    { label: string; cls: string; icon: typeof ArrowUp }
  > = {
    improved: {
      label: "Improved",
      cls: "bg-green-600 text-white",
      icon: ArrowUp,
    },
    regressed: {
      label: "Regressed",
      cls: "bg-red-600 text-white",
      icon: ArrowDown,
    },
    neutral: {
      label: "Neutral",
      cls: "bg-muted text-foreground",
      icon: Minus,
    },
  };

  const v = improvementVerdict ? verdictMeta[improvementVerdict] : null;
  const Icon = v?.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Comparison
        </CardTitle>
        <CardDescription>
          Re-run of an earlier session. Compare bot behavior across versions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground mb-1">
              Source ({source.botVersionLabel ?? "unknown"})
            </div>
            <div className="space-y-0.5">
              <div>
                {source.messageCount} msg ·{" "}
                {source.avgResponseMs !== null
                  ? `${(source.avgResponseMs / 1000).toFixed(1)}s avg`
                  : "no timing"}
              </div>
              <div>
                Client verdict:{" "}
                <span className="font-medium">
                  {source.clientVerdict ?? "(not set)"}
                </span>
              </div>
              <Link
                href={`/admin/runs/${source.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                View source
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="rounded-md border p-3 border-primary/40 bg-primary/5">
            <div className="text-xs text-muted-foreground mb-1">This run</div>
            <div className="space-y-0.5">
              <div>
                {current.messageCount} msg ·{" "}
                {current.avgResponseMs !== null
                  ? `${(current.avgResponseMs / 1000).toFixed(1)}s avg`
                  : "no timing"}
              </div>
            </div>
          </div>
        </div>

        {improvementVerdict && v ? (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={v.cls}>
                {Icon && <Icon className="h-3 w-3" />}
                {v.label}
              </Badge>
            </div>
            {improvementReason && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {improvementReason}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheck}
              disabled={pending || !canCheck}
              title={!canCheck ? "Both runs must be done" : ""}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Re-check
            </Button>
          </div>
        ) : (
          <Button onClick={handleCheck} disabled={pending || !canCheck}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Check improvement
            {!canCheck && (
              <span className="text-xs opacity-70 ml-1">
                (wait for both runs to finish)
              </span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
