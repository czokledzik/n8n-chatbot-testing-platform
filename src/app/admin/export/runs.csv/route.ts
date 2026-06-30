import { type NextRequest } from "next/server";
import { fetchRunsForExport, runsToCsv } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("clientId");
  const botVersionId = sp.get("botVersionId");
  const runIds = sp.get("runIds")?.split(",").filter(Boolean);

  const runs = await fetchRunsForExport({
    clientId,
    botVersionId,
    runIds,
  });

  const csv = runsToCsv(runs);
  const filename = `runs-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
