import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { ClientEditForm } from "./client-edit-form";
import { MagicLinkPanel } from "./magic-link-panel";
import { DangerZone } from "./danger-zone";
import { BotVersionsSection } from "./bot-versions/section";
import { headers } from "next/headers";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fresh_token?: string; rotated_token?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      _count: { select: { knowledge: true, testRuns: true } },
    },
  });
  if (!client) notFound();

  const oneTimeToken = sp.fresh_token ?? sp.rotated_token ?? null;

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All clients
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <Badge variant="secondary" className="font-mono">
              /c/{client.slug}
            </Badge>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href={`/admin/clients/${client.id}/dashboard`}
              className="text-primary hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={`/admin/clients/${client.id}/analyses`}
              className="text-primary hover:underline"
            >
              Analyses
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {client._count.knowledge} knowledge · {client._count.testRuns} runs ·
          added {client.createdAt.toLocaleString()}
        </p>
      </header>

      {oneTimeToken && (
        <MagicLinkPanel
          link={`${origin}/c/${client.slug}/access?token=${oneTimeToken}`}
          rotated={Boolean(sp.rotated_token)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
          <CardDescription>
            The slug is permanent. The webhook is used by test runs and live
            chat for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientEditForm
            clientId={client.id}
            initial={{
              name: client.name,
              n8nWebhookUrl: client.n8nWebhookUrl ?? "",
            }}
          />
        </CardContent>
      </Card>

      <BotVersionsSection clientId={client.id} />

      <DangerZone clientId={client.id} clientName={client.name} />
    </div>
  );
}
