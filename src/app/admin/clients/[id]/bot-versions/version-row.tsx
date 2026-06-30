"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteBotVersion, setActiveVersion } from "./actions";

type Props = {
  clientId: string;
  version: {
    id: string;
    label: string;
    n8nWebhookUrl: string;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    runCount: number;
  };
};

function maskUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.slice(0, 12)}…`;
  } catch {
    return url.slice(0, 30) + "…";
  }
}

export function VersionRow({ clientId, version }: Props) {
  const [pending, startTransition] = useTransition();
  const [showFullUrl, setShowFullUrl] = useState(false);

  function handleActivate() {
    if (version.isActive) return;
    startTransition(async () => {
      await setActiveVersion({ clientId, versionId: version.id });
      toast.success(`${version.label} is now active`);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete bot version "${version.label}"?`)) return;
    startTransition(async () => {
      const res = await deleteBotVersion({
        clientId,
        versionId: version.id,
      });
      if (res.ok) toast.success("Deleted");
      else toast.error(res.error ?? "Delete failed");
    });
  }

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{version.label}</span>
            {version.isActive && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {version.runCount} runs
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setShowFullUrl((v) => !v)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground truncate block max-w-full text-left"
            title={showFullUrl ? "Click to mask" : "Click to reveal"}
          >
            {showFullUrl ? version.n8nWebhookUrl : maskUrl(version.n8nWebhookUrl)}
          </button>
          {version.notes && (
            <div className="text-xs text-muted-foreground mt-1">
              {version.notes}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">
            Added {new Date(version.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!version.isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleActivate}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Set active
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending || version.runCount > 0}
            className="text-destructive hover:text-destructive"
            title={
              version.runCount > 0
                ? "Cannot delete — has runs"
                : "Delete version"
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
