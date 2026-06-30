import { Bot } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { NewVersionForm } from "./new-version-form";
import { VersionRow } from "./version-row";

export async function BotVersionsSection({ clientId }: { clientId: string }) {
  const versions = await prisma.botVersion.findMany({
    where: { clientId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { testRuns: true } } },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Bot versions
          </CardTitle>
          <CardDescription>
            Track iterations of the bot. New runs use the active version&apos;s
            webhook URL by default.
          </CardDescription>
        </div>
        <NewVersionForm clientId={clientId} />
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No versions yet. Add the first one — it will become active by
            default and replace the legacy client-level webhook URL.
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((v) => (
              <VersionRow
                key={v.id}
                clientId={clientId}
                version={{
                  id: v.id,
                  label: v.label,
                  n8nWebhookUrl: v.n8nWebhookUrl,
                  isActive: v.isActive,
                  notes: v.notes,
                  createdAt: v.createdAt,
                  runCount: v._count.testRuns,
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
