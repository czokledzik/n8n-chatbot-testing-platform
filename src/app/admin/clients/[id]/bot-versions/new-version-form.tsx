"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createBotVersion,
  type CreateBotVersionState,
} from "./actions";

const initial: CreateBotVersionState = { ok: false };

export function NewVersionForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const bound = createBotVersion.bind(null, clientId);
  const [state, action, pending] = useActionState(bound, initial);

  useEffect(() => {
    if (state.ok) {
      toast.success("Bot version created");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add version
      </Button>
    );
  }

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">New bot version</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={action} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="label" className="text-xs">
            Label
          </Label>
          <Input
            id="label"
            name="label"
            placeholder="v2"
            required
            autoComplete="off"
          />
          {state.fieldErrors?.label && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.label}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n8nWebhookUrl" className="text-xs">
            n8n webhook URL
          </Label>
          <Input
            id="n8nWebhookUrl"
            name="n8nWebhookUrl"
            type="url"
            placeholder="https://n8n.example.com/webhook/abc"
            required
            autoComplete="off"
          />
          {state.fieldErrors?.n8nWebhookUrl && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.n8nWebhookUrl}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs">
            Notes (optional)
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="What changed in this version?"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="setActive"
            defaultChecked
            className="h-4 w-4"
          />
          Make active (default for new runs)
        </label>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
