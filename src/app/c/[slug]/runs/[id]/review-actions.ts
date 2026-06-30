"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { CLIENT_VERDICTS, ISSUE_TAG_VALUES } from "@/lib/constants";

const verdictSchema = z.enum(CLIENT_VERDICTS).nullable();
const tagsSchema = z.array(z.enum(ISSUE_TAG_VALUES as [string, ...string[]]));

export async function setClientVerdict(input: {
  slug: string;
  runId: string;
  verdict: (typeof CLIENT_VERDICTS)[number] | null;
}): Promise<{ ok: boolean; error?: string }> {
  const client = await requireClient(input.slug);
  const verdict = verdictSchema.parse(input.verdict);

  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id },
    select: { id: true },
  });
  if (!run) return { ok: false, error: "Run not found" };

  await prisma.testRun.update({
    where: { id: run.id },
    data: { clientVerdict: verdict },
  });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}

export async function setClientVerified(input: {
  slug: string;
  runId: string;
  verified: boolean;
}): Promise<{ ok: boolean }> {
  const client = await requireClient(input.slug);
  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id },
    select: { id: true },
  });
  if (!run) return { ok: false };

  await prisma.testRun.update({
    where: { id: run.id },
    data: { clientVerifiedAt: input.verified ? new Date() : null },
  });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}

export async function setClientTags(input: {
  slug: string;
  runId: string;
  tags: string[];
}): Promise<{ ok: boolean }> {
  const client = await requireClient(input.slug);
  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id },
    select: { id: true },
  });
  if (!run) return { ok: false };

  const tags = tagsSchema.parse(input.tags);

  await prisma.testRun.update({
    where: { id: run.id },
    data: { issueTags: tags },
  });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}
