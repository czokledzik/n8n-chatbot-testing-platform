import { type NextRequest } from "next/server";
import { fetchRunsForExport, runsToCsv } from "@/lib/export";
import { getCurrentClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const client = await getCurrentClient(slug);
  if (!client) return new Response("Forbidden", { status: 403 });

  const runs = await fetchRunsForExport({ clientId: client.id });
  const csv = runsToCsv(runs);
  const filename = `${client.slug}-runs-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
