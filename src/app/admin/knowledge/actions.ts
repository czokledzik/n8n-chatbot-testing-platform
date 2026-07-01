"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateTestCases } from "./[id]/generate-action";
import { extractPdfText } from "@/lib/pdf";

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_DOCS_PER_BATCH = 20;
const ALLOWED_COUNTS = new Set([0, 3, 5, 10]);

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
  let contentValue = String(formData.get("content") ?? "").trim();
  const pdf = formData.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.size > MAX_PDF_BYTES) {
      return {
        ok: false,
        error: `PDF too large (>${Math.round(MAX_PDF_BYTES / 1024 / 1024)}MB)`,
        fieldErrors: { content: "PDF exceeds size limit" },
      };
    }
    try {
      const buffer = await pdf.arrayBuffer();
      contentValue = (await extractPdfText(buffer)).trim();
    } catch (err) {
      return {
        ok: false,
        error: `PDF extract failed: ${(err as Error).message}`,
        fieldErrors: { content: "Could not read PDF" },
      };
    }
  }

  const parsed = createSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    content: contentValue,
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

export type BatchResult = {
  ok: boolean;
  error?: string;
  created?: number;
  scheduled?: number;
  failed?: { index: number; title: string; reason: string }[];
};

export async function batchCreateKnowledge(
  formData: FormData,
): Promise<BatchResult> {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: "Pick a client" };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Client not found" };

  const rawCount = Number(formData.get("docCount") ?? 0);
  if (!rawCount || rawCount < 1 || rawCount > MAX_DOCS_PER_BATCH) {
    return { ok: false, error: `Invalid doc count (1-${MAX_DOCS_PER_BATCH})` };
  }

  const failed: NonNullable<BatchResult["failed"]> = [];
  let created = 0;
  let scheduled = 0;

  for (let i = 0; i < rawCount; i++) {
    const title = String(formData.get(`doc-${i}-title`) ?? "").trim();
    const text = String(formData.get(`doc-${i}-content`) ?? "").trim();
    const pdf = formData.get(`doc-${i}-pdf`);
    const casesCount = Number(formData.get(`doc-${i}-cases`) ?? 0);

    if (!title) {
      failed.push({ index: i, title: "(untitled)", reason: "Missing title" });
      continue;
    }
    if (!ALLOWED_COUNTS.has(casesCount)) {
      failed.push({ index: i, title, reason: "Invalid cases count" });
      continue;
    }

    let content = text;
    if (pdf instanceof File && pdf.size > 0) {
      if (pdf.size > MAX_PDF_BYTES) {
        failed.push({
          index: i,
          title,
          reason: `PDF too large (>${Math.round(MAX_PDF_BYTES / 1024 / 1024)}MB)`,
        });
        continue;
      }
      try {
        const buffer = await pdf.arrayBuffer();
        const extracted = await extractPdfText(buffer);
        content = extracted.trim();
      } catch (err) {
        failed.push({
          index: i,
          title,
          reason: `PDF extract failed: ${(err as Error).message}`,
        });
        continue;
      }
    }

    if (!content || content.length < 20) {
      failed.push({
        index: i,
        title,
        reason: "Content too short (need at least 20 chars)",
      });
      continue;
    }

    try {
      const knowledge = await prisma.knowledge.create({
        data: { clientId, title, content },
      });
      created++;
      if (casesCount > 0) {
        void generateTestCases(knowledge.id, casesCount);
        scheduled++;
      }
    } catch (err) {
      failed.push({
        index: i,
        title,
        reason: (err as Error).message.slice(0, 200),
      });
    }
  }

  revalidatePath("/admin/knowledge");
  revalidatePath("/admin/tests");
  revalidatePath("/admin");

  return { ok: true, created, scheduled, failed };
}
