"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "needs-review", label: "Needs review" },
  { value: "fixed", label: "Fixed" },
  { value: "errors", label: "Errors" },
  { value: "active", label: "Active" },
] as const;

export function FilterTabs({
  counts,
}: {
  counts: Record<(typeof TABS)[number]["value"], number>;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("filter") ?? "all";
  const clientId = params.get("client");

  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const active = current === tab.value;
        const sp = new URLSearchParams();
        if (tab.value !== "all") sp.set("filter", tab.value);
        if (clientId) sp.set("client", clientId);
        const href = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70 tabular-nums">
              {counts[tab.value]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
