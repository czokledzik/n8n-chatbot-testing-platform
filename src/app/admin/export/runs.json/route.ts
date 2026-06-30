import { type NextRequest } from "next/server";
import { fetchRunsForExport, runsToJson } from "@/lib/export";

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
  const data = await runsToJson(runs);
  const filename = `runs-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
