import Link from "next/link";
import { GitCompare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientVerdictBadge } from "@/components/issue-tags-display";
import { RunStatusBadge } from "@/components/run-status-badge";
import { cn } from "@/lib/utils";

export type VersionEntry = {
  versionId: string;
  label: string;
  isActive: boolean;
  runId: string | null;
  status: string | null;
  clientVerdict: string | null;
};

export function VersionSwitcher({
  entries,
  currentRunId,
  runHrefBase,
  description = "Jump to the same test case executed on a different bot version.",
}: {
  entries: VersionEntry[];
  currentRunId: string;
  runHrefBase: string; // e.g. "/admin/runs" or "/c/[slug]/runs"
  description?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Bot version comparison
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {entries.map((e) => {
            const isCurrent = e.runId === currentRunId;
            const inner = (
              <div
                className={cn(
                  "rounded-lg border p-3 space-y-1.5 transition-colors",
                  isCurrent
                    ? "bg-primary/8 border-primary/40"
                    : e.runId
                      ? "hover:bg-muted/40"
                      : "opacity-60 border-dashed",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {e.label}
                  </span>
                  {e.isActive && (
                    <Badge className="verdict-pass backdrop-blur-sm text-[10px] h-4 px-1.5">
                      active
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 border-primary/50 text-primary"
                    >
                      current
                    </Badge>
                  )}
                </div>
                {e.runId ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <RunStatusBadge status={e.status ?? "done"} verdict={null} />
                    <ClientVerdictBadge verdict={e.clientVerdict} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not tested on this version yet.
                  </p>
                )}
              </div>
            );

            if (isCurrent || !e.runId) {
              return <div key={e.versionId}>{inner}</div>;
            }
            return (
              <Link
                key={e.versionId}
                href={`${runHrefBase}/${e.runId}`}
                className="block"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
