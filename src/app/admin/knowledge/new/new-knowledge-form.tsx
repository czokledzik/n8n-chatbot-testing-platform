"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledge,
  type CreateKnowledgeState,
} from "../actions";

const initial: CreateKnowledgeState = { ok: false };

type ClientOption = { id: string; name: string; slug: string };

export function NewKnowledgeForm({
  clients,
  defaultClientId,
}: {
  clients: ClientOption[];
  defaultClientId: string;
}) {
  const [state, action, pending] = useActionState(createKnowledge, initial);
  const [clientId, setClientId] = useState(defaultClientId);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label>Client</Label>
        <input type="hidden" name="clientId" value={clientId} />
        <div className="flex flex-wrap gap-1.5">
          {clients.map((c) => {
            const active = clientId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setClientId(c.id)}
                className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {c.name}
                <span className="ml-1.5 opacity-70 font-mono text-xs">
                  /c/{c.slug}
                </span>
              </button>
            );
          })}
        </div>
        {state.fieldErrors?.clientId && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.clientId}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Product FAQ"
          autoComplete="off"
          required
        />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          rows={14}
          placeholder="Paste your knowledge text here..."
          required
        />
        {state.fieldErrors?.content && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.content}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/admin/knowledge" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save knowledge
        </Button>
      </div>
    </form>
  );
}
