"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const PLACEHOLDER = "__keep__";

const schema = z.object({
  n8nWebhookUrl: z
    .string()
    .trim()
    .url({ message: "Enter a valid URL (https://...)" }),
  openaiApiKey: z.string().trim(),
  language: z.enum(["en", "pl"]),
});

export type SettingsActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"n8nWebhookUrl" | "openaiApiKey" | "language", string>
  >;
  savedAt?: number;
};

export async function saveSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = schema.safeParse({
    n8nWebhookUrl: formData.get("n8nWebhookUrl"),
    openaiApiKey: formData.get("openaiApiKey"),
    language: formData.get("language"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: {
        n8nWebhookUrl: flat.fieldErrors.n8nWebhookUrl?.[0],
        openaiApiKey: flat.fieldErrors.openaiApiKey?.[0],
        language: flat.fieldErrors.language?.[0],
      },
    };
  }

  const { n8nWebhookUrl, openaiApiKey, language } = parsed.data;

  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  const keyToStore =
    openaiApiKey === PLACEHOLDER
      ? existing?.openaiApiKey ?? null
      : openaiApiKey;

  if (!keyToStore || !keyToStore.startsWith("sk-")) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: {
        openaiApiKey: 'OpenAI key must start with "sk-"',
      },
    };
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { n8nWebhookUrl, openaiApiKey: keyToStore, language },
    create: { id: 1, n8nWebhookUrl, openaiApiKey: keyToStore, language },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true, savedAt: Date.now() };
}
