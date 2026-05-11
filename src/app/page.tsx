import Link from "next/link";
import { Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-xl bg-primary text-primary-foreground grid place-items-center">
          <Bot className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Chatbot Testing Platform
          </h1>
          <p className="text-muted-foreground">
            Adversarial multi-turn testing for n8n chatbots, with auto-judging
            and a shareable read-only portal for clients.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link href="/admin" className={buttonVariants()}>
            Admin panel
          </Link>
        </div>
        <p className="text-xs text-muted-foreground pt-6">
          Clients access their results via a magic link provided by the admin.
        </p>
      </div>
    </div>
  );
}
