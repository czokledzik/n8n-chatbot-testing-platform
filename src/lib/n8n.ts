import "server-only";
import { getSettings } from "@/lib/settings";
import { N8N_TIMEOUT_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export async function resolveWebhookUrl(
  clientId: string | null | undefined,
): Promise<string> {
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { n8nWebhookUrl: true },
    });
    if (client?.n8nWebhookUrl) return client.n8nWebhookUrl;
  }
  const { n8nWebhookUrl } = await getSettings();
  if (!n8nWebhookUrl) {
    throw new Error(
      "n8n webhook URL is not configured (neither client nor global Settings).",
    );
  }
  return n8nWebhookUrl;
}

export async function callN8nWebhook(
  message: string,
  sessionId: string,
  options: { url?: string; clientId?: string | null } = {},
): Promise<string> {
  const url = options.url ?? (await resolveWebhookUrl(options.clientId));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `n8n webhook returned ${response.status}: ${text.slice(0, 200)}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const candidate =
        (typeof data.output === "string" && data.output) ||
        (typeof data.response === "string" && data.response) ||
        (typeof data.text === "string" && data.text) ||
        (typeof data.message === "string" && data.message);
      if (candidate) return candidate;
      return JSON.stringify(data);
    }

    return await response.text();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`n8n webhook timed out after ${N8N_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
