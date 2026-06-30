"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CLIENT_VERDICTS,
  type ClientVerdict,
  ISSUE_TAGS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  setClientTags,
  setClientVerdict,
  setClientVerified,
} from "./review-actions";

const VERDICT_META: Record<ClientVerdict, { label: string; cls: string }> = {
  pass: {
    label: "Pass",
    cls: "data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600",
  },
  fail: {
    label: "Fail",
    cls: "data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600",
  },
  "needs-review": {
    label: "Needs review",
    cls: "data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  },
};

export function ClientReviewCard({
  slug,
  runId,
  initial,
}: {
  slug: string;
  runId: string;
  initial: {
    clientVerdict: ClientVerdict | null;
    clientVerifiedAt: Date | null;
    issueTags: string[];
  };
}) {
  const [verdict, setVerdict] = useState<ClientVerdict | null>(
    initial.clientVerdict,
  );
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(
    initial.clientVerifiedAt,
  );
  const [tags, setTags] = useState<string[]>(initial.issueTags ?? []);
  const [pending, startTransition] = useTransition();

  function changeVerdict(next: ClientVerdict | null) {
    setVerdict(next);
    startTransition(async () => {
      const res = await setClientVerdict({ slug, runId, verdict: next });
      if (!res.ok) toast.error(res.error ?? "Failed to save");
    });
  }

  function toggleVerified() {
    const next = verifiedAt ? null : new Date();
    setVerifiedAt(next);
    startTransition(async () => {
      await setClientVerified({ slug, runId, verified: Boolean(next) });
    });
  }

  function toggleTag(value: string) {
    const next = tags.includes(value)
      ? tags.filter((t) => t !== value)
      : [...tags, value];
    setTags(next);
    startTransition(async () => {
      await setClientTags({ slug, runId, tags: next });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Your review
        </CardTitle>
        <CardDescription>
          Mark how this run went. Visible to the admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-foreground/80">Verdict</div>
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_VERDICTS.map((v) => {
              const meta = VERDICT_META[v];
              const active = verdict === v;
              return (
                <button
                  key={v}
                  type="button"
                  data-active={active}
                  onClick={() => changeVerdict(active ? null : v)}
                  disabled={pending}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm transition-colors",
                    "hover:bg-muted",
                    meta.cls,
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-foreground/80">
            Issue tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_TAGS.map((t) => {
              const active = tags.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleTag(t.value)}
                  disabled={pending}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-xs transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t">
          <button
            type="button"
            onClick={toggleVerified}
            disabled={pending}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors",
              verifiedAt
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                : "hover:bg-muted",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {verifiedAt ? "Verified" : "Mark as verified"}
          </button>
          {verifiedAt && (
            <div className="text-xs text-muted-foreground mt-1.5 text-center">
              {new Date(verifiedAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
