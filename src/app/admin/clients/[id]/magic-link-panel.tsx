"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MagicLinkPanel({
  link,
  rotated,
}: {
  link: string;
  rotated: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Copy failed"));
  }

  return (
    <Card
      variant="chunky"
      className="!border-amber-500 bg-amber-500/10 [--chunky-shadow:oklch(0.65_0.16_60)]"
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 font-display">
          <KeyRound className="h-4 w-4" />
          {rotated ? "New magic link" : "Magic link generated"}
        </CardTitle>
        <CardDescription className="text-amber-800 dark:text-amber-300">
          Copy this link now — it won&apos;t be shown again. Anyone with it can
          read this client&apos;s results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border bg-background/70 backdrop-blur-sm px-3 py-2 text-xs font-mono">
            {link}
          </code>
          <Button size="sm" variant="chunky" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
