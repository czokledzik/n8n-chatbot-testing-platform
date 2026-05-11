"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createClient,
  type CreateClientState,
} from "../actions";

const initial: CreateClientState = { ok: false };

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function NewClientForm() {
  const [state, action, pending] = useActionState(createClient, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/c/</span>
          <Input
            id="slug"
            name="slug"
            placeholder="acme"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            pattern="[a-z0-9][a-z0-9-]*"
          />
        </div>
        {state.fieldErrors?.slug ? (
          <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Lowercase letters, digits and dashes. Becomes part of the portal URL.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="n8nWebhookUrl">n8n Webhook URL (optional)</Label>
        <Input
          id="n8nWebhookUrl"
          name="n8nWebhookUrl"
          type="url"
          placeholder="https://client-n8n.example.com/webhook/abc"
          autoComplete="off"
        />
        {state.fieldErrors?.n8nWebhookUrl ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.n8nWebhookUrl}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            If empty, the global webhook from Settings will be used as fallback.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/clients"
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create client
        </Button>
      </div>
    </form>
  );
}
