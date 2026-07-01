"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type VersionStatus = {
  versionId: string;
  label: string;
  isActive: boolean;
  runId: string | null;
  status: string | null;
  clientVerdict: string | null;
};

/**
 * Compact per-version status pills for a test case.
 * Shows label + tiny verdict indicator per bot version.
 * Untested versions rendered dashed muted.
 */
export function VersionStatusPills({
  versions,
  runHrefBase,
  className,
}: {
  versions: VersionStatus[];
  runHrefBase?: string; // e.g. "/admin/runs" — links pills with runs to detail
  className?: string;
}) {
  if (versions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {versions.map((v) => {
        const status = pillStatus(v);
        const styles = STYLES[status];
        const label = `${v.label} ${LABELS[status]}`;
        const title = v.runId
          ? `Latest run: ${status === "untested" ? "not tested" : status}`
          : "Not tested on this version yet";

        if (v.runId && runHrefBase) {
          return (
            <Link
              key={v.versionId}
              href={`${runHrefBase}/${v.runId}`}
              title={title}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none font-mono transition-colors backdrop-blur-sm",
                styles,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          );
        }
        return (
          <span
            key={v.versionId}
            title={title}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none font-mono backdrop-blur-sm",
              styles,
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

type Status = "pass" | "fail" | "needs-review" | "error" | "running" | "untested";

function pillStatus(v: VersionStatus): Status {
  if (!v.runId) return "untested";
  if (v.status === "error") return "error";
  if (v.status === "running" || v.status === "pending") return "running";
  if (v.clientVerdict === "pass") return "pass";
  if (v.clientVerdict === "fail") return "fail";
  if (v.clientVerdict === "needs-review") return "needs-review";
  return "untested";
}

const LABELS: Record<Status, string> = {
  pass: "✓",
  fail: "✗",
  "needs-review": "?",
  error: "!",
  running: "…",
  untested: "—",
};

const STYLES: Record<Status, string> = {
  pass: "verdict-pass hover:brightness-110",
  fail: "verdict-fail hover:brightness-110",
  "needs-review": "verdict-review hover:brightness-110",
  error: "bg-destructive/15 text-destructive border-destructive/40 hover:brightness-110",
  running:
    "bg-primary/12 text-primary border-primary/35 hover:brightness-110 animate-pulse",
  untested:
    "border-dashed border-border/60 text-muted-foreground bg-transparent",
};
