import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="max-w-lg w-full">
        <div className="glass-panel-strong rounded-3xl px-8 py-10 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_28px_-8px_oklch(0.65_0.19_40/0.55)]">
            <Bot className="h-8 w-8" />
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-primary/12 text-primary border border-primary/25 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Adversarial multi-turn testing
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight leading-tight">
              Chatbot Testing Platform
            </h1>
            <p className="text-muted-foreground">
              Automated test scenarios, live client portal, side-by-side version
              comparison — for teams shipping n8n chatbots.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/admin"
              className={buttonVariants({ variant: "chunky", size: "lg" })}
            >
              Enter admin panel
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Clients receive a magic link to a private read-only portal.
          </p>
        </div>
      </div>
    </div>
  );
}
