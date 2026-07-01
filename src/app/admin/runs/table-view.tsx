"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RunStatusBadge } from "@/components/run-status-badge";
import {
  ClientVerdictBadge,
  IssueTagsDisplay,
} from "@/components/issue-tags-display";
import { bulkMarkFixed, bulkAnalyze, bulkDeleteRuns } from "./bulk-actions";

export type RunRow = {
  id: string;
  status: string;
  clientVerdict: string | null;
  devFixedAt: Date | null;
  botVersionLabel: string | null;
  testCaseTitle: string | null;
  knowledgeId: string | null;
  knowledgeTitle: string | null;
  clientName: string | null;
  clientSlug: string | null;
  messageCount: number;
  avgResponseMs: number | null;
  issueTags: string[];
  source: string;
  startedAt: Date;
  finishedAt: Date | null;
};

function formatMs(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDuration(start: Date, end: Date | null) {
  const ms = (end ?? new Date()).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function RunsTable({
  rows,
  groupBy = "none",
}: {
  rows: RunRow[];
  groupBy?: "none" | "document";
}) {
  const [rawSelected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Rows change under us on every poll refresh. Instead of pruning state in
  // an effect, derive the effective selection from what is still visible.
  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const selected = useMemo(() => {
    const filtered = [...rawSelected].filter((id) => rowIds.has(id));
    return filtered.length === rawSelected.size
      ? rawSelected
      : new Set(filtered);
  }, [rawSelected, rowIds]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === rows.length
        ? new Set()
        : new Set(rows.map((r) => r.id)),
    );
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  const selectedClients = useMemo(() => {
    const clients = new Set(
      rows.filter((r) => selected.has(r.id)).map((r) => r.clientName ?? "—"),
    );
    return clients.size;
  }, [rows, selected]);

  const groups = useMemo(() => {
    if (groupBy !== "document") return null;
    const map = new Map<string, { title: string; rows: RunRow[] }>();
    for (const r of rows) {
      const key = r.knowledgeId ?? "__none__";
      const title = r.knowledgeTitle ?? "No document";
      if (!map.has(key)) map.set(key, { title, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()].map(([key, value]) => ({
      key,
      title: value.title,
      rows: value.rows,
    }));
  }, [rows, groupBy]);

  function toggleGroup(groupRows: RunRow[]) {
    const ids = groupRows.map((r) => r.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function handleMarkFixed() {
    startTransition(async () => {
      const res = await bulkMarkFixed({ runIds: selectedIds, fixed: true });
      toast.success(`Marked ${res.count} run${res.count === 1 ? "" : "s"} as fixed`);
      setSelected(new Set());
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete ${selectedIds.length} run${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await bulkDeleteRuns({ runIds: selectedIds });
      toast.success(`Deleted ${res.count} run${res.count === 1 ? "" : "s"}`);
      setSelected(new Set());
    });
  }

  function handleAnalyze() {
    if (selectedClients > 1) {
      toast.error("Batch analysis works on runs from one client only");
      return;
    }
    const defaultTitle = `Batch · ${selectedIds.length} runs · ${new Date().toLocaleString()}`;
    const title = prompt("Report title?", defaultTitle);
    if (!title) return;
    startTransition(async () => {
      try {
        await bulkAnalyze({ runIds: selectedIds, title });
      } catch (err) {
        const msg = (err as Error).message;
        if (msg !== "NEXT_REDIRECT") toast.error(msg);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        No runs match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 rounded-md border bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="text-sm">
            <span className="font-medium">{selected.size}</span> selected
            {selectedClients > 1 && (
              <span className="text-amber-600 ml-2">
                · {selectedClients} clients (batch analysis disabled)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkFixed}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Mark as fixed
            </Button>
            <Button
              size="sm"
              variant="ghost"
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
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={pending || selectedClients !== 1 || selected.size > 30}
              title={
                selected.size > 30
                  ? "Max 30 runs per analysis"
                  : selectedClients !== 1
                    ? "Pick runs from one client"
                    : ""
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Analyze batch
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Verdict</th>
              <th className="px-3 py-2 text-left">Fixed</th>
              <th className="px-3 py-2 text-left">Version</th>
              <th className="px-3 py-2 text-left">Test case</th>
              <th className="px-3 py-2 text-left">Document</th>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Tags</th>
              <th className="px-3 py-2 text-right">Msg</th>
              <th className="px-3 py-2 text-right">Avg</th>
              <th className="px-3 py-2 text-right">Dur</th>
              <th className="px-3 py-2 text-left">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(groups ? groups.flatMap((g) => [
              { type: "header" as const, key: `h-${g.key}`, group: g },
              ...g.rows.map((r) => ({ type: "row" as const, key: r.id, row: r })),
            ]) : rows.map((r) => ({ type: "row" as const, key: r.id, row: r }))).map((item) => {
              if (item.type === "header") {
                const g = item.group;
                const groupIds = g.rows.map((r) => r.id);
                const allSelected = groupIds.every((id) => selected.has(id));
                return (
                  <tr key={item.key} className="bg-muted/60">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleGroup(g.rows)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td colSpan={12} className="px-3 py-1.5 text-xs font-medium">
                      {g.title}{" "}
                      <span className="text-muted-foreground">
                        · {g.rows.length} run{g.rows.length === 1 ? "" : "s"}
                      </span>
                    </td>
                  </tr>
                );
              }
              const r = item.row;
              const isSelected = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={isSelected ? "bg-primary/5" : "hover:bg-muted/30"}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <RunStatusBadge status={r.status} verdict={null} />
                  </td>
                  <td className="px-3 py-2">
                    <ClientVerdictBadge verdict={r.clientVerdict} />
                  </td>
                  <td className="px-3 py-2">
                    {r.devFixedAt ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {r.botVersionLabel ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {r.botVersionLabel}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 max-w-[220px] truncate">
                    <Link
                      href={`/admin/runs/${r.id}`}
                      className="hover:underline"
                    >
                      {r.testCaseTitle ??
                        (r.source === "live" ? "Live conversation" : "—")}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate">
                    {r.knowledgeId ? (
                      <Link
                        href={`/admin/knowledge/${r.knowledgeId}`}
                        className="hover:underline"
                      >
                        {r.knowledgeTitle}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.clientName ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <IssueTagsDisplay tags={r.issueTags} size="xs" />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.messageCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    {formatMs(r.avgResponseMs)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    {formatDuration(r.startedAt, r.finishedAt)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.startedAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
