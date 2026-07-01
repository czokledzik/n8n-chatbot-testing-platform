"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  Home,
  MessageCircle,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function ClientSidebar({
  slug,
  clientName,
}: {
  slug: string;
  clientName: string;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const items = [
    { href: base, label: "Overview", icon: Home, exact: true },
    { href: `${base}/knowledge`, label: "Knowledge", icon: BookOpen },
    { href: `${base}/runs`, label: "Test Runs", icon: PlayCircle },
    { href: `${base}/chat`, label: "Live Chat", icon: MessageCircle },
  ];

  return (
    <aside className="w-60 shrink-0 flex flex-col glass-panel !rounded-none !border-t-0 !border-b-0 !border-l-0 sticky top-0 h-screen">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border/50">
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-4px_oklch(0.65_0.19_40/0.5)]">
          <Bot className="h-4 w-4" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm font-display font-semibold truncate">
            {clientName}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            /c/{slug}
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-sidebar-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Read-only</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
