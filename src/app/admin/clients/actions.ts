"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes only");

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  n8nWebhookUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateClientState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "slug" | "n8nWebhookUrl", string>>;
};

export async function createClient(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    n8nWebhookUrl: formData.get("n8nWebhookUrl"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: {
        name: flat.fieldErrors.name?.[0],
        slug: flat.fieldErrors.slug?.[0],
        n8nWebhookUrl: flat.fieldErrors.n8nWebhookUrl?.[0],
      },
    };
  }

  const existing = await prisma.client.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return {
      ok: false,
      error: "Slug already used",
      fieldErrors: { slug: "Already used by another client" },
    };
  }

  const rawToken = generateToken();
  const created = await prisma.client.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      n8nWebhookUrl: parsed.data.n8nWebhookUrl ?? null,
      accessTokenHash: hashToken(rawToken),
    },
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${created.id}?fresh_token=${rawToken}`);
}

export async function rotateToken(clientId: string) {
  const rawToken = generateToken();
  await prisma.client.update({
    where: { id: clientId },
    data: { accessTokenHash: hashToken(rawToken) },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}?rotated_token=${rawToken}`);
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  n8nWebhookUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UpdateClientState = {
  ok: boolean;
  error?: string;
};

export async function updateClient(
  clientId: string,
  _prev: UpdateClientState,
  formData: FormData,
): Promise<UpdateClientState> {
  const parsed = updateSchema.safeParse({
    name: formData.get("name"),
    n8nWebhookUrl: formData.get("n8nWebhookUrl"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Validation failed" };
  }
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name,
      n8nWebhookUrl: parsed.data.n8nWebhookUrl ?? null,
    },
  });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return { ok: true };
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  redirect("/admin/clients");
}
