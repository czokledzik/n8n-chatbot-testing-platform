"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { callN8nWebhook } from "@/lib/n8n";

export async function startLiveSession(slug: string): Promise<never> {
  const client = await requireClient(slug);
  const run = await prisma.testRun.create({
    data: {
      clientId: client.id,
      source: "live",
      status: "running",
    },
  });
  revalidatePath(`/c/${slug}/runs`);
  revalidatePath(`/c/${slug}/chat`);
  redirect(`/c/${slug}/runs/${run.id}`);
}

export async function sendLiveMessage(input: {
  slug: string;
  runId: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = await requireClient(input.slug);

  const run = await prisma.testRun.findFirst({
    where: { id: input.runId, clientId: client.id, source: "live" },
  });
  if (!run) return { ok: false, error: "Session not found" };

  const trimmed = input.message.trim();
  if (!trimmed) return { ok: false, error: "Empty message" };

  await prisma.message.create({
    data: { testRunId: run.id, role: "user", content: trimmed },
  });

  try {
    const reply = await callN8nWebhook(trimmed, run.id, {
      clientId: client.id,
    });
    await prisma.message.create({
      data: { testRunId: run.id, role: "bot", content: reply },
    });
  } catch (err) {
    await prisma.message.create({
      data: {
        testRunId: run.id,
        role: "bot",
        content: `[webhook error: ${(err as Error).message}]`,
      },
    });
    revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  return { ok: true };
}

export async function endLiveSession(input: {
  slug: string;
  runId: string;
}): Promise<{ ok: boolean }> {
  const client = await requireClient(input.slug);
  await prisma.testRun.updateMany({
    where: { id: input.runId, clientId: client.id, source: "live" },
    data: { status: "done", finishedAt: new Date() },
  });
  revalidatePath(`/c/${input.slug}/runs/${input.runId}`);
  revalidatePath(`/c/${input.slug}/runs`);
  return { ok: true };
}
