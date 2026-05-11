import "server-only";
import { prisma } from "@/lib/db";

export type Language = "en" | "pl";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  pl: "Polski",
};

export function languageInstruction(lang: Language): string {
  return lang === "pl"
    ? "Write all generated text in Polish (Polski). Use natural, native phrasing."
    : "Write all generated text in English. Use natural, native phrasing.";
}

export async function getSettings() {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  const language: Language = row?.language === "pl" ? "pl" : "en";
  return {
    n8nWebhookUrl: row?.n8nWebhookUrl ?? "",
    openaiApiKey: row?.openaiApiKey ?? "",
    language,
    updatedAt: row?.updatedAt ?? null,
  };
}
