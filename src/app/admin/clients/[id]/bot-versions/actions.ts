"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const labelSchema = z
  .string()
  .trim()
  .min(1, "Label required")
  .max(40)
  .regex(/^[A-Za-z0-9._-]+$/, "letters, digits, dot, dash and underscore only");

const createSchema = z.object({
  label: labelSchema,
  n8nWebhookUrl: z.string().trim().url({ message: "Enter a valid URL" }),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  setActive: z
    .union([z.literal("on"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => v === "on"),
});

export type CreateBotVersionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"label" | "n8nWebhookUrl" | "notes", string>>;
};

export async function createBotVersion(
  clientId: string,
  _prev: CreateBotVersionState,
  formData: FormData,
): Promise<CreateBotVersionState> {
  const parsed = createSchema.safeParse({
    label: formData.get("label"),
    n8nWebhookUrl: formData.get("n8nWebhookUrl"),
    notes: formData.get("notes"),
    setActive: formData.get("setActive"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: {
        label: flat.fieldErrors.label?.[0],
        n8nWebhookUrl: flat.fieldErrors.n8nWebhookUrl?.[0],
        notes: flat.fieldErrors.notes?.[0],
      },
    };
  }

  const exists = await prisma.botVersion.findUnique({
    where: { clientId_label: { clientId, label: parsed.data.label } },
    select: { id: true },
  });
  if (exists) {
    return {
      ok: false,
      error: "Label already used",
      fieldErrors: { label: "Already used for this client" },
    };
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.setActive) {
      await tx.botVersion.updateMany({
        where: { clientId },
        data: { isActive: false },
      });
    }
    await tx.botVersion.create({
      data: {
        clientId,
        label: parsed.data.label,
        n8nWebhookUrl: parsed.data.n8nWebhookUrl,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.setActive,
      },
    });
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

export async function setActiveVersion(input: {
  clientId: string;
  versionId: string;
}): Promise<{ ok: boolean }> {
  await prisma.$transaction([
    prisma.botVersion.updateMany({
      where: { clientId: input.clientId },
      data: { isActive: false },
    }),
    prisma.botVersion.update({
      where: { id: input.versionId },
      data: { isActive: true },
    }),
  ]);
  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true };
}

export async function deleteBotVersion(input: {
  clientId: string;
  versionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const runCount = await prisma.testRun.count({
    where: { botVersionId: input.versionId },
  });
  if (runCount > 0) {
    return {
      ok: false,
      error: `Cannot delete — version has ${runCount} runs. Set another version active instead.`,
    };
  }
  await prisma.botVersion.delete({ where: { id: input.versionId } });
  revalidatePath(`/admin/clients/${input.clientId}`);
  return { ok: true };
}
