"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAdminScope } from "@/app/admin/scope-actions";

type ClientOption = { id: string; name: string };

export function ScopeSelector({
  clients,
  currentId,
}: {
  clients: ClientOption[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function select(id: string | null) {
    setOpen(false);
    startTransition(async () => {
      await setAdminScope(id);
      router.refresh();
    });
  }

  const current = clients.find((c) => c.id === currentId);
  const label = current?.name ?? "All clients";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-background/40 backdrop-blur-sm px-3 py-2 text-sm hover:bg-sidebar-accent/50 transition-colors"
      >
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate font-medium">{label}</span>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-lg bg-popover text-popover-foreground border border-border shadow-lg p-1 z-[100] max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => select(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-sidebar-accent/60 transition-colors",
              currentId === null && "bg-sidebar-accent/60 font-medium",
            )}
          >
            <span className="flex-1 text-left">All clients</span>
            {currentId === null && <Check className="h-3.5 w-3.5" />}
          </button>
          {clients.length > 0 && (
            <div className="h-px bg-border/60 my-1" />
          )}
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm hover:bg-sidebar-accent/60 transition-colors",
                currentId === c.id && "bg-sidebar-accent/60 font-medium",
              )}
            >
              <span className="flex-1 text-left truncate">{c.name}</span>
              {currentId === c.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
