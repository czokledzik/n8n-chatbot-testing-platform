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
    <aside className="w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-5 py-5 border-b flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Bot className="h-4 w-4" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold truncate">{clientName}</div>
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
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        Read-only portal
      </div>
    </aside>
  );
}
