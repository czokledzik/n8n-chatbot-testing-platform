"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Poller({
  intervalMs,
  active,
}: {
  intervalMs: number;
  active: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
