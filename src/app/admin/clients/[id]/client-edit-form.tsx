"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  rotateToken,
  updateClient,
  type UpdateClientState,
} from "../actions";

const initial: UpdateClientState = { ok: false };

export function ClientEditForm({
  clientId,
  initial: initialValues,
}: {
  clientId: string;
  initial: { name: string; n8nWebhookUrl: string };
}) {
  const updateBound = updateClient.bind(null, clientId);
  const [state, action, pending] = useActionState(updateBound, initial);

  useEffect(() => {
    if (state.ok) toast.success("Client updated");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialValues.name}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
          <Input
            id="n8nWebhookUrl"
            name="n8nWebhookUrl"
            type="url"
            defaultValue={initialValues.n8nWebhookUrl}
            placeholder="https://client-n8n.example.com/webhook/abc"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to fall back to the global webhook from Settings.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>

      <form
        action={async () => {
          await rotateToken(clientId);
        }}
      >
        <div className="rounded-md border p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-sm">Rotate magic link</div>
            <p className="text-xs text-muted-foreground">
              Invalidates the current link. The client will need a new URL.
            </p>
          </div>
          <Button type="submit" variant="outline">
            Rotate
          </Button>
        </div>
      </form>
    </div>
  );
}
