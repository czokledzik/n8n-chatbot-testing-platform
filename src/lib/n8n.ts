import "server-only";
import { getSettings } from "@/lib/settings";
import { N8N_TIMEOUT_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type WebhookResult = { output: string; responseTimeMs: number };

export async function resolveWebhookUrl(input: {
  clientId?: string | null;
  botVersionId?: string | null;
}): Promise<string> {
  if (input.botVersionId) {
    const version = await prisma.botVersion.findUnique({
      where: { id: input.botVersionId },
      select: { n8nWebhookUrl: true },
    });
    if (version?.n8nWebhookUrl) return version.n8nWebhookUrl;
  }

  if (input.clientId) {
    const active = await prisma.botVersion.findFirst({
      where: { clientId: input.clientId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { n8nWebhookUrl: true },
    });
    if (active?.n8nWebhookUrl) return active.n8nWebhookUrl;

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { n8nWebhookUrl: true },
    });
    if (client?.n8nWebhookUrl) return client.n8nWebhookUrl;
  }

  const { n8nWebhookUrl } = await getSettings();
  if (!n8nWebhookUrl) {
    throw new Error(
      "n8n webhook URL is not configured (no BotVersion, no Client URL, no global Settings).",
    );
  }
  return n8nWebhookUrl;
}

export async function callN8nWebhook(
  message: string,
  sessionId: string,
  options: {
    url?: string;
    clientId?: string | null;
    botVersionId?: string | null;
  } = {},
): Promise<WebhookResult> {
  const url =
    options.url ??
    (await resolveWebhookUrl({
      clientId: options.clientId,
      botVersionId: options.botVersionId,
    }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  const startedAt = Date.now();

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
    let output: string;
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const candidate =
        (typeof data.output === "string" && data.output) ||
        (typeof data.response === "string" && data.response) ||
        (typeof data.text === "string" && data.text) ||
        (typeof data.message === "string" && data.message);
      output = candidate || JSON.stringify(data);
    } else {
      output = await response.text();
    }

    return { output, responseTimeMs: Date.now() - startedAt };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`n8n webhook timed out after ${N8N_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
