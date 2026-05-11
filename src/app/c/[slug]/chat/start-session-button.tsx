"use client";

import { useTransition } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startLiveSession } from "./actions";

export function StartSessionButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      try {
        await startLiveSession(slug);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg !== "NEXT_REDIRECT") toast.error(msg);
      }
    });
  }

  return (
    <Button onClick={handleStart} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      Start new session
    </Button>
  );
}
