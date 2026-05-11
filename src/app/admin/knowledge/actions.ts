"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  title: z.string().trim().min(1, "Title required").max(200),
  content: z.string().trim().min(20, "Need at least 20 chars of content"),
});

export type CreateKnowledgeState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"clientId" | "title" | "content", string>>;
};

export async function createKnowledge(
  _prev: CreateKnowledgeState,
  formData: FormData,
): Promise<CreateKnowledgeState> {
  const parsed = createSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: {
        clientId: flat.fieldErrors.clientId?.[0],
        title: flat.fieldErrors.title?.[0],
        content: flat.fieldErrors.content?.[0],
      },
    };
  }

  const clientExists = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });
  if (!clientExists) {
    return {
      ok: false,
      error: "Client not found",
      fieldErrors: { clientId: "Pick a valid client" },
    };
  }

  const created = await prisma.knowledge.create({
    data: {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      content: parsed.data.content,
    },
  });

  revalidatePath("/admin/knowledge");
  revalidatePath("/admin");
  redirect(`/admin/knowledge/${created.id}`);
}

export async function deleteKnowledge(id: string) {
  await prisma.knowledge.delete({ where: { id } });
  revalidatePath("/admin/knowledge");
  revalidatePath("/admin/tests");
  revalidatePath("/admin");
  redirect("/admin/knowledge");
}
