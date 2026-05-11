import "server-only";
import OpenAI from "openai";
import { getSettings } from "@/lib/settings";

export const MODEL = "gpt-5.5";

export async function getOpenAI() {
  const { openaiApiKey } = await getSettings();
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured. Set it in /settings.");
  }
  return new OpenAI({ apiKey: openaiApiKey });
}
