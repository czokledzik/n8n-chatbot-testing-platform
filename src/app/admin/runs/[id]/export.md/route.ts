import { type NextRequest } from "next/server";
import { fetchRunMarkdown } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await fetchRunMarkdown(id);
  if (!data) return new Response("Run not found", { status: 404 });

  const safeTitle =
    data.run.testCase?.title?.replace(/[^a-z0-9-]+/gi, "-").slice(0, 40) ??
    "run";
  const filename = `${safeTitle}-${id.slice(0, 6)}.md`;

  return new Response(data.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
